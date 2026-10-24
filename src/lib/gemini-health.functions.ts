import { createServerFn } from "@tanstack/react-start";
import type { GeminiHealthResult } from "./gemini-health.server";

export const checkGeminiHealth = createServerFn({ method: "POST" }).handler(
  async (): Promise<GeminiHealthResult> => {
    const { checkGeminiConnection } = await import("./gemini-health.server");
    return checkGeminiConnection();
  },
);
