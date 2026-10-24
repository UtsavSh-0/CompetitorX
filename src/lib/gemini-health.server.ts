import {
  describeGeminiFailure,
  getGeminiStatus,
  getSafeGeminiErrorReason,
} from "./gemini-diagnostics";
import { retryGeminiRequest } from "./gemini-retry.server";

export type GeminiHealthResult =
  | { ok: true; configured: true; model: string; message: string }
  | { ok: false; configured: boolean; model?: string; error: string };

export async function checkGeminiConnection(): Promise<GeminiHealthResult> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      error: "GEMINI_API_KEY is not configured in the server environment.",
    };
  }
  const model = process.env["GEMINI_MODEL"] || "gemini-3.8-flash";
  try {
    let modelVerified = false;
    const response = await retryGeminiRequest(
      apiKey,
      async (client) => {
        if (!modelVerified) {
          await client.models.get({ model });
          modelVerified = true;
        }
        return client.interactions.create({ model, input: "Reply with OK only.", store: false });
      },
      ({ attempt, status, waitMs }) =>
        console.warn("Retrying Gemini connectivity check", { attempt, status, waitMs }),
    );
    if (response.output_text?.trim().toUpperCase() !== "OK") {
      return {
        ok: false,
        configured: true,
        model,
        error:
          "Gemini returned an unexpected connectivity-test response. Check the model and retry.",
      };
    }
    return { ok: true, configured: true, model, message: "Gemini connection successful." };
  } catch (error) {
    const status = getGeminiStatus(error);
    console.error("Gemini connectivity check failed", {
      status: status ?? "unknown",
      reason: getSafeGeminiErrorReason(error, apiKey),
    });
    return { ok: false, configured: true, model, error: describeGeminiFailure(status) };
  }
}
