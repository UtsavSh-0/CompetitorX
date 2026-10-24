import { GoogleGenAI } from "@google/genai";
import { getGeminiStatus } from "./gemini-diagnostics";

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export function parseRetryAfter(headers: Headers): number | undefined {
  const retryAfterMs = headers.get("retry-after-ms");
  if (retryAfterMs) {
    const milliseconds = Number(retryAfterMs);
    if (Number.isFinite(milliseconds) && milliseconds >= 0) return milliseconds;
  }
  const retryAfter = headers.get("retry-after");
  if (!retryAfter) return undefined;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const timestamp = Date.parse(retryAfter);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : undefined;
}

export function calculateGeminiRetryDelay(
  attempt: number,
  retryAfterMs?: number,
  random = Math.random(),
): number {
  if (retryAfterMs !== undefined) return retryAfterMs + random * 250;
  const baseDelayMs = attempt === 1 ? 1_000 : 2_000;
  return Math.round(baseDelayMs * (0.8 + random * 0.4));
}

function isTransientFailure(error: unknown): boolean {
  const status = getGeminiStatus(error);
  if (status !== undefined) return RETRYABLE_STATUS_CODES.has(status);
  return (
    !!error &&
    typeof error === "object" &&
    (error as { name?: unknown }).name === "APIConnectionError"
  );
}

export async function retryGeminiRequest<T>(
  apiKey: string,
  operation: (client: GoogleGenAI) => Promise<T>,
  onRetry?: (details: { attempt: number; status?: number; waitMs: number }) => void,
): Promise<T> {
  const maxAttempts = 3;
  const totalBudgetMs = 45_000;
  const startedAt = Date.now();
  const deadlineAt = startedAt + totalBudgetMs;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const elapsed = Date.now() - startedAt;
    const remainingMs = totalBudgetMs - elapsed;
    if (remainingMs <= 0 && lastError) throw lastError;

    let retryAfterMs: number | undefined;
    const timeoutMs = Math.min(18_000, remainingMs);
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: timeoutMs,
        retryOptions: { attempts: 1 },
        fetch: async (input, init) => {
          const remainingRequestMs = deadlineAt - Date.now();
          if (remainingRequestMs <= 0) throw lastError ?? new Error("Gemini request timed out");
          const budgetSignal = AbortSignal.timeout(remainingRequestMs);
          const signal = init?.signal ? AbortSignal.any([init.signal, budgetSignal]) : budgetSignal;
          const response = await fetch(input, { ...init, signal });
          if (!response.ok) retryAfterMs = parseRetryAfter(response.headers);
          return response;
        },
      },
    });

    try {
      return await operation(client);
    } catch (error) {
      lastError = error;
      if (!isTransientFailure(error) || attempt === maxAttempts) throw error;

      const waitMs = calculateGeminiRetryDelay(attempt, retryAfterMs);
      const timeLeft = totalBudgetMs - (Date.now() - startedAt);
      if (waitMs + 1_000 >= timeLeft) throw error;

      const status = getGeminiStatus(error);
      onRetry?.({
        attempt,
        ...(status === undefined ? {} : { status }),
        waitMs: Math.round(waitMs),
      });
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError;
}
