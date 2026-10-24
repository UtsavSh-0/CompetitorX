import { afterEach, describe, expect, it, vi } from "vitest";
import { runComparison } from "@/lib/compare.server";

describe("TinyFish comparison research", () => {
  const originalTinyFishKey = process.env["TINYFISH_API_KEY"];
  const originalLovableKey = process.env["LOVABLE_API_KEY"];

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalTinyFishKey === undefined) delete process.env["TINYFISH_API_KEY"];
    else process.env["TINYFISH_API_KEY"] = originalTinyFishKey;
    if (originalLovableKey === undefined) delete process.env["LOVABLE_API_KEY"];
    else process.env["LOVABLE_API_KEY"] = originalLovableKey;
  });

  it("keeps successful live retrievals and reports a failed competitor honestly", async () => {
    process.env["TINYFISH_API_KEY"] = "test-tinyfish-key";
    delete process.env["LOVABLE_API_KEY"];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl = new URL(String(input));
        if (requestUrl.hostname === "api.search.tinyfish.ai") {
          return { ok: true, json: async () => ({ results: [] }) } as Response;
        }
        const { urls } = JSON.parse(String(init?.body)) as { urls: string[] };
        const url = urls[0]!;
        if (url.includes("beta.example")) {
          return {
            ok: true,
            json: async () => ({
              results: [],
              errors: [{ url, error: "target_unreachable" }],
            }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                url,
                final_url: url,
                title: "Alpha | Product",
                description: "Project workflows for teams.",
                text: "Alpha provides project workflows for product teams.",
                links: [],
              },
            ],
            errors: [],
          }),
        } as Response;
      }),
    );

    const result = await runComparison(["https://alpha.example", "https://beta.example"]);

    expect(result.competitors[0]).toMatchObject({ ok: true, extraction: "basic" });
    expect(result.competitors[0]?.pages).toEqual([
      { url: "https://alpha.example/", title: "Alpha | Product" },
    ]);
    expect(result.competitors[1]).toMatchObject({ ok: false });
    expect(result.competitors[1]?.error).toContain("could not be reached");
    expect(result.researchToken).toBeTruthy();
  });
});
