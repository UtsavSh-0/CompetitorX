import { GoogleGenAI } from "@google/genai";
import { describeGeminiFailure, getGeminiStatus } from "./gemini-diagnostics";

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
    const client = new GoogleGenAI({ apiKey });
    const response = await client.interactions.create(
      { model, input: "Reply with OK only.", store: false },
      { timeout_ms: 15_000, maxRetries: 0 },
    );
    if (!response.output_text?.trim()) {
      return {
        ok: false,
        configured: true,
        model,
        error: "Gemini responded without text. Check the model configuration and retry.",
      };
    }
    return { ok: true, configured: true, model, message: "Gemini connection successful." };
  } catch (error) {
    const status = getGeminiStatus(error);
    console.error("Gemini connectivity check failed", status ?? "unknown error");
    return { ok: false, configured: true, model, error: describeGeminiFailure(status) };
  }
}
