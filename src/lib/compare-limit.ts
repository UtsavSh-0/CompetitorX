export const COMPARE_LIMIT_COOKIE = "competitorx_compare_used";

export function hasUsedComparison(cookieString: string): boolean {
  return cookieString.split(";").some((cookie) => {
    const [name, ...value] = cookie.trim().split("=");
    return name === COMPARE_LIMIT_COOKIE && value.join("=") === "1";
  });
}

export function markComparisonUsed(): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COMPARE_LIMIT_COOKIE}=1; Max-Age=315360000; Path=/; SameSite=Lax${secure}`;
}
