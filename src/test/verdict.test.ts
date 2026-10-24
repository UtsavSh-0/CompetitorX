import { beforeEach, describe, expect, it, vi } from "vitest";

const { createInteraction, getModel } = vi.hoisted(() => ({
  createInteraction: vi.fn(),
  getModel: vi.fn(),
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { get: getModel };
    interactions = { create: createInteraction };
  },
}));

import { generateEvidenceVerdict } from "@/lib/verdict.server";
import { checkGeminiConnection } from "@/lib/gemini-health.server";
import { describeGeminiFailure, getGeminiStatus } from "@/lib/gemini-diagnostics";
import {
  calculateGeminiRetryDelay,
  parseRetryAfter,
  retryGeminiRequest,
} from "@/lib/gemini-retry.server";

const baseVerdict = {
  status: "success",
  overallVerdict: {
    winner: "Alpha",
    headline: "Best fit",
    reasoning: "The source supports it.",
    confidence: "medium",
    confidenceReason: "Some fields are missing.",
  },
  priorityRecommendations: [
    {
      priority: "Features",
      winner: "Alpha",
      reason: "Feature evidence is available.",
      evidenceUrls: ["https://alpha.example/features"],
    },
  ],
  competitorAnalysis: [
    {
      name: "Alpha",
      strengths: [{ claim: "Lists workflows", evidenceUrls: ["https://alpha.example/features"] }],
      weaknesses: [],
      bestFor: "Teams needing workflows",
      pricingAssessment: "Not found in researched sources.",
      missingInformation: ["Published pricing"],
    },
    {
      name: "Beta",
      strengths: [],
      weaknesses: [],
      bestFor: "Not found in researched sources.",
      pricingAssessment: "Not found in researched sources.",
      missingInformation: ["Features", "Pricing"],
    },
  ],
  keyDifferences: [],
  risksAndUnknowns: ["Beta feature evidence is missing."],
  nextSteps: ["Review Beta's feature documentation."],
};

function encode(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signedResearchToken(incomplete = false) {
  const snapshot = {
    version: 1,
    expiresAt: Date.now() + 60_000,
    competitors: [
      {
        name: "Alpha",
        inputUrl: "https://alpha.example",
        ok: true,
        pages: ["https://alpha.example/features"],
        fields: {
          main_features: {
            value: "Workflows",
            status: "found",
            sourceUrl: "https://alpha.example/features",
            evidenceExcerpt: "We support workflows.",
          },
        },
      },
      {
        name: "Beta",
        inputUrl: "https://beta.example",
        ok: true,
        pages: ["https://beta.example"],
        fields: incomplete
          ? null
          : {
              target_audience: {
                value: "Small teams",
                status: "found",
                sourceUrl: "https://beta.example",
                evidenceExcerpt: "Designed for small teams.",
              },
            },
      },
    ],
  };
  const payload = encode(JSON.stringify(snapshot));
  const secret = "test-signing-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  process.env["TINYFISH_API_KEY"] = secret;
  return `${payload}.${encode(binary)}`;
}

describe("Gemini evidence verdict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["GEMINI_API_KEY"] = "test-gemini-key";
    process.env["TINYFISH_API_KEY"] = "test-signing-secret";
    delete process.env["GEMINI_MODEL"];
    createInteraction.mockResolvedValue({ output_text: JSON.stringify(baseVerdict) });
  });

  it("returns a structured verdict with citations from fetched pages", async () => {
    const result = await generateEvidenceVerdict(await signedResearchToken(), ["features"]);
    expect(result.overallVerdict.winner).toBe("Alpha");
    expect(result.competitorAnalysis).toHaveLength(2);
    expect(result.competitorAnalysis[1]?.pricingAssessment).toBe(
      "Not found in researched sources.",
    );
    expect(createInteraction).toHaveBeenCalledOnce();
  });

  it("rejects fabricated citation URLs", async () => {
    createInteraction.mockResolvedValue({
      output_text: JSON.stringify({
        ...baseVerdict,
        priorityRecommendations: [
          {
            ...baseVerdict.priorityRecommendations[0],
            evidenceUrls: ["https://fake.example/claim"],
          },
        ],
      }),
    });
    await expect(
      generateEvidenceVerdict(await signedResearchToken(), ["features"]),
    ).rejects.toThrow("unverified source link");
  });

  it("rejects a valid fetched URL attached to the wrong competitor", async () => {
    createInteraction.mockResolvedValue({
      output_text: JSON.stringify({
        ...baseVerdict,
        competitorAnalysis: [
          {
            ...baseVerdict.competitorAnalysis[0],
            strengths: [{ claim: "Lists workflows", evidenceUrls: ["https://beta.example"] }],
          },
          baseVerdict.competitorAnalysis[1],
        ],
      }),
    });
    await expect(
      generateEvidenceVerdict(await signedResearchToken(), ["features"]),
    ).rejects.toThrow("another competitor's source");
  });

  it("rejects a winner outside the researched competitor set", async () => {
    createInteraction.mockResolvedValue({
      output_text: JSON.stringify({
        ...baseVerdict,
        overallVerdict: { ...baseVerdict.overallVerdict, winner: "Gamma" },
      }),
    });
    await expect(
      generateEvidenceVerdict(await signedResearchToken(), ["features"]),
    ).rejects.toThrow("unknown competitor");
  });

  it("allows Gemini to return insufficient evidence without forcing a winner", async () => {
    createInteraction.mockResolvedValue({
      output_text: JSON.stringify({
        ...baseVerdict,
        status: "insufficient_evidence",
        overallVerdict: {
          ...baseVerdict.overallVerdict,
          winner: null,
          headline: "Insufficient evidence",
        },
      }),
    });
    const result = await generateEvidenceVerdict(await signedResearchToken(true), ["features"]);
    expect(result.status).toBe("insufficient_evidence");
    expect(result.overallVerdict.winner).toBeNull();
  });

  it("rejects a success verdict if a competitor has no verified findings", async () => {
    await expect(
      generateEvidenceVerdict(await signedResearchToken(true), ["features"]),
    ).rejects.toThrow("without enough verified evidence");
  });

  it("returns a clear error when the Gemini key is missing", async () => {
    delete process.env["GEMINI_API_KEY"];
    await expect(generateEvidenceVerdict("unused", ["features"])).rejects.toThrow("GEMINI_API_KEY");
    expect(createInteraction).not.toHaveBeenCalled();
  });

  it("converts rate limits into a retryable message", async () => {
    createInteraction.mockRejectedValue({ status: 429 });
    await expect(
      generateEvidenceVerdict(await signedResearchToken(), ["features"]),
    ).rejects.toThrow("rate limit");
  });

  it("rejects malformed model JSON", async () => {
    createInteraction.mockResolvedValue({ output_text: "not json" });
    await expect(
      generateEvidenceVerdict(await signedResearchToken(), ["features"]),
    ).rejects.toThrow("malformed verdict data");
  });
});

describe("Gemini connectivity diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["GEMINI_API_KEY"] = "test-gemini-key";
    delete process.env["GEMINI_MODEL"];
    getModel.mockResolvedValue({ name: "models/gemini-3.8-flash" });
    createInteraction.mockResolvedValue({ output_text: "OK" });
  });

  it("makes a minimal server-side request and reports the configured model", async () => {
    await expect(checkGeminiConnection()).resolves.toEqual({
      ok: true,
      configured: true,
      model: "gemini-3.8-flash",
      message: "Gemini connection successful.",
    });
    expect(createInteraction).toHaveBeenCalledWith({
      model: "gemini-3.8-flash",
      input: "Reply with OK only.",
      store: false,
    });
    expect(getModel).toHaveBeenCalledWith({ model: "gemini-3.8-flash" });
  });

  it("reports missing key configuration without making a request", async () => {
    delete process.env["GEMINI_API_KEY"];
    await expect(checkGeminiConnection()).resolves.toMatchObject({
      ok: false,
      configured: false,
      error: expect.stringContaining("GEMINI_API_KEY"),
    });
    expect(createInteraction).not.toHaveBeenCalled();
  });

  it("does not report connectivity success for an invalid test response", async () => {
    createInteraction.mockResolvedValue({ output_text: "unexpected" });
    await expect(checkGeminiConnection()).resolves.toMatchObject({
      ok: false,
      configured: true,
      error: expect.stringContaining("unexpected connectivity-test response"),
    });
  });

  it("classifies API access errors without returning the raw SDK message", async () => {
    createInteraction.mockRejectedValue({ status: 403, message: "sensitive upstream response" });
    const result = await checkGeminiConnection();
    expect(result).toMatchObject({ ok: false, configured: true });
    expect("error" in result ? result.error : "").toContain("permissions");
    expect(JSON.stringify(result)).not.toContain("sensitive upstream response");
  });

  it("reports SDK connection timeouts as a retryable network timeout", async () => {
    createInteraction.mockRejectedValue({
      name: "APIConnectionTimeoutError",
      message: "Request timed out",
    });
    const result = await checkGeminiConnection();
    expect("error" in result ? result.error : "").toContain("timed out");
  });

  it("maps authentication, model, quota and upstream statuses", () => {
    expect(describeGeminiFailure(401)).toContain("authentication failed");
    expect(describeGeminiFailure(404)).toContain("GEMINI_MODEL");
    expect(describeGeminiFailure(429)).toContain("quota or rate limit");
    expect(describeGeminiFailure(503)).toContain("temporarily at capacity");
    expect(getGeminiStatus({ status: "PERMISSION_DENIED", code: 403 })).toBe(403);
    expect(getGeminiStatus({ name: "APIConnectionTimeoutError" })).toBe(408);
  });

  it("retries a transient 503 once and succeeds within the bounded policy", async () => {
    vi.useFakeTimers();
    createInteraction
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ output_text: "OK" });
    const onRetry = vi.fn();
    try {
      const pending = retryGeminiRequest(
        "test-key",
        (client) => client.interactions.create({ model: "gemini-3.8-flash", input: "OK" }),
        onRetry,
      );
      await vi.runAllTimersAsync();
      await expect(pending).resolves.toMatchObject({ output_text: "OK" });
      expect(createInteraction).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledOnce();
      expect(onRetry.mock.calls[0]?.[0]).toMatchObject({ attempt: 1, status: 503 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops after three attempts and does not retry permanent request errors", async () => {
    vi.useFakeTimers();
    createInteraction.mockRejectedValue({ status: 503 });
    try {
      const pending = retryGeminiRequest("test-key", (client) =>
        client.interactions.create({ model: "gemini-3.8-flash", input: "OK" }),
      );
      const assertion = expect(pending).rejects.toMatchObject({ status: 503 });
      await vi.runAllTimersAsync();
      await assertion;
      expect(createInteraction).toHaveBeenCalledTimes(3);

      vi.clearAllMocks();
      createInteraction.mockRejectedValue({ status: 403 });
      await expect(
        retryGeminiRequest("test-key", (client) =>
          client.interactions.create({ model: "gemini-3.8-flash", input: "OK" }),
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(createInteraction).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("parses Retry-After seconds and the Gemini retry-after-ms header", () => {
    expect(parseRetryAfter(new Headers({ "retry-after": "2" }))).toBe(2_000);
    expect(parseRetryAfter(new Headers({ "retry-after-ms": "1250" }))).toBe(1_250);
    expect(calculateGeminiRetryDelay(1, undefined, 0.5)).toBe(1_000);
    expect(calculateGeminiRetryDelay(2, undefined, 0.5)).toBe(2_000);
    expect(calculateGeminiRetryDelay(1, 5_000, 0)).toBe(5_000);
  });
});
