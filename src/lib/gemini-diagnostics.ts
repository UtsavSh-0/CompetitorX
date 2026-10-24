export function getGeminiStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as {
    name?: unknown;
    status?: unknown;
    code?: unknown;
    message?: unknown;
    response?: { status?: unknown };
  };
  if (
    (typeof value.name === "string" && /timeout/i.test(value.name)) ||
    (typeof value.message === "string" && /timed? ?out|timeout/i.test(value.message))
  ) {
    return 408;
  }
  return [value.status, value.code, value.response?.status].find(
    (status): status is number => typeof status === "number",
  );
}

export function describeGeminiFailure(status?: number): string {
  if (status === 400)
    return "Gemini rejected the request. Check the configured model and request format.";
  if (status === 401) return "Gemini authentication failed. Check the server-side GEMINI_API_KEY.";
  if (status === 403)
    return "Gemini denied access. Check API access, project permissions, region and billing settings.";
  if (status === 404) return "Gemini could not find the configured model. Check GEMINI_MODEL.";
  if (status === 408 || status === 504) return "Gemini timed out. Please retry.";
  if (status === 429) return "Gemini quota or rate limit reached. Wait briefly, then retry.";
  if (status !== undefined && status >= 500 && status <= 599)
    return "Gemini is temporarily unavailable. Please retry.";
  return "Gemini could not complete the request. Check server connectivity and retry.";
}
