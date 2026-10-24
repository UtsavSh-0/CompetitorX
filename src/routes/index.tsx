import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Globe,
  HelpCircle,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compareWebsites } from "@/lib/compare.functions";
import { checkGeminiHealth } from "@/lib/gemini-health.functions";
import { generateVerdict } from "@/lib/verdict.functions";
import { rankByEvidencePriorities } from "@/lib/compare.analytics";
import type { Verdict } from "@/lib/verdict.types";
import {
  FIELD_KEYS,
  FIELD_LABELS,
  type CompareResponse,
  type FieldKey,
  type Finding,
} from "@/lib/compare.types";
import { validatePublicUrl } from "@/lib/url-validation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CompetitorX — Compare competitor websites with AI" },
      {
        name: "description",
        content:
          "Enter 2–3 websites and get a sourced comparison of offerings, features, audiences and public pricing.",
      },
      { property: "og:title", content: "CompetitorX — AI Competitive Intelligence" },
      {
        property: "og:description",
        content: "Live, sourced side-by-side comparisons of competitor websites.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const EXAMPLES = [
  {
    label: "Linear vs Asana vs Monday",
    urls: ["https://linear.app", "https://asana.com", "https://monday.com"],
  },
  { label: "Notion vs Coda", urls: ["https://www.notion.com", "https://coda.io"] },
  { label: "Vercel vs Netlify", urls: ["https://vercel.com", "https://www.netlify.com"] },
];

function Index() {
  const [urls, setUrls] = useState<string[]>(["", ""]);
  const [errors, setErrors] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const run = useServerFn(compareWebsites);

  async function submit() {
    const filled = urls.map((u) => u.trim()).filter(Boolean);
    const errs = urls.map((u) =>
      u.trim()
        ? ("error" in validatePublicUrl(u) && (validatePublicUrl(u) as { error: string }).error) ||
          null
        : null,
    );
    setErrors(errs);
    setFatal(null);
    if (errs.some(Boolean)) return;
    if (filled.length < 2) {
      setFatal("Enter at least two websites to compare.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await run({ data: { urls: filled } });
      if (res.ok) setResult(res.result);
      else setFatal(res.error);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setFatal(
        msg.includes(":") && msg.length < 200
          ? msg
          : "We couldn't reach the research service. Please retry.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            CompetitorX
          </div>
          <span className="text-sm text-muted-foreground">Live competitive research</span>
        </div>
      </header>

      <section className="bg-hero">
        <div className="mx-auto max-w-3xl px-6 pb-12 pt-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-accent-foreground">
            <Globe className="h-3.5 w-3.5" /> Real-time website research with source links
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Know exactly how your <span className="text-gradient">competitors</span> stack up
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Enter two or three websites. CompetitorX reads their official pages and builds a
            side-by-side matrix of offerings, features, audiences and published pricing — every
            finding linked to its source.
          </p>
          <Button
            variant="hero"
            size="lg"
            className="mt-8 h-12 rounded-xl px-7"
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            Start Comparing <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <div
          ref={formRef}
          className="mx-auto max-w-3xl scroll-mt-8 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8"
        >
          <h2 className="text-xl font-semibold">Websites to compare</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Public http(s) addresses only. 2–3 competitors.
          </p>
          <div className="mt-5 space-y-3">
            {urls.map((u, i) => (
              <div key={i}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <Input
                      aria-label={`Competitor ${i + 1} website`}
                      aria-invalid={!!errors[i]}
                      placeholder="https://example.com"
                      value={u}
                      disabled={loading}
                      className="h-11 pl-8"
                      onChange={(e) => {
                        const next = [...urls];
                        next[i] = e.target.value;
                        setUrls(next);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                    />
                  </div>
                  {urls.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11"
                      aria-label="Remove website"
                      disabled={loading}
                      onClick={() => setUrls(urls.filter((_, j) => j !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {errors[i] && <p className="mt-1 text-sm text-destructive">{errors[i]}</p>}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {urls.length < 3 ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={loading}
                onClick={() => setUrls([...urls, ""])}
              >
                <Plus className="h-4 w-4" /> Add a third website
              </Button>
            ) : (
              <span />
            )}
            <Button
              variant="hero"
              className="h-11 rounded-xl px-6"
              disabled={loading}
              onClick={submit}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? "Researching…" : "Compare Websites"}
            </Button>
          </div>
          <div className="mt-6 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Try an example
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  disabled={loading}
                  onClick={() => {
                    setUrls(ex.urls);
                    setErrors([]);
                  }}
                  className="rounded-full border border-border bg-secondary px-3 py-1 text-sm text-secondary-foreground transition hover:border-primary/40 disabled:opacity-50"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div
            className="mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-card"
            aria-live="polite"
          >
            <p className="font-medium">
              Researching {urls.filter((u) => u.trim()).length} websites… this usually takes 30–90
              seconds.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              TinyFish is searching and retrieving public pages. Retrieved page and extraction
              details appear here when the request completes.
            </p>
          </div>
        )}

        {fatal && !loading && (
          <div
            role="alert"
            className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Comparison couldn't be completed</p>
              <p className="mt-1 text-sm text-muted-foreground">{fatal}</p>
            </div>
            <Button variant="outline" size="sm" onClick={submit}>
              <RotateCcw className="h-4 w-4" /> Retry
            </Button>
          </div>
        )}

        {result && !loading && <Results result={result} onRetry={submit} />}
      </main>
    </div>
  );
}

function Results({ result, onRetry }: { result: CompareResponse; onRetry: () => void }) {
  const [priorities, setPriorities] = useState<string[]>(["features", "integrations"]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [verdictFor, setVerdictFor] = useState<string | null>(null);
  const [verdictError, setVerdictError] = useState<string | null>(null);
  const [generatingVerdict, setGeneratingVerdict] = useState(false);
  const verdictRequestInFlight = useRef(false);
  const [geminiHealth, setGeminiHealth] = useState<{
    ok: boolean;
    model?: string;
    message?: string;
    error?: string;
  } | null>(null);
  const [checkingGemini, setCheckingGemini] = useState(false);
  const geminiHealthInFlight = useRef(false);
  const requestVerdict = useServerFn(generateVerdict);
  const requestGeminiHealth = useServerFn(checkGeminiHealth);
  const eligible =
    !!result.researchToken && result.competitors.filter((competitor) => competitor.ok).length >= 2;
  const prioritySignature = priorities.slice().sort().join(",");

  async function testGeminiConnection() {
    if (geminiHealthInFlight.current) return;
    geminiHealthInFlight.current = true;
    setCheckingGemini(true);
    setGeminiHealth(null);
    try {
      setGeminiHealth(await requestGeminiHealth());
    } catch {
      setGeminiHealth({
        ok: false,
        error:
          "Could not reach the Gemini connectivity check. Verify this app's server deployment and retry.",
      });
    } finally {
      geminiHealthInFlight.current = false;
      setCheckingGemini(false);
    }
  }

  async function generate() {
    if (!eligible || !result.researchToken || verdictRequestInFlight.current) return;
    verdictRequestInFlight.current = true;
    setGeneratingVerdict(true);
    setVerdictError(null);
    try {
      const response = await requestVerdict({
        data: { researchToken: result.researchToken, priorities },
      });
      if (response.ok) {
        setVerdict(response.verdict);
        setVerdictFor(prioritySignature);
      } else {
        setVerdict(null);
        setVerdictFor(null);
        setVerdictError(response.error);
      }
    } catch {
      setVerdict(null);
      setVerdictFor(null);
      setVerdictError("Gemini couldn't generate the verdict. Please retry.");
    } finally {
      verdictRequestInFlight.current = false;
      setGeneratingVerdict(false);
    }
  }

  const cols = result.competitors;
  return (
    <div className="mt-12 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Comparison matrix</h2>
          <p className="text-sm text-muted-foreground">
            Researched {new Date(result.generatedAt).toLocaleString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" /> Run again
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="w-44 p-4 text-left font-medium text-muted-foreground">Field</th>
              {cols.map((c) => (
                <th key={c.inputUrl} className="p-4 text-left align-top">
                  <div className="font-display text-base font-semibold text-foreground">
                    {c.name}
                  </div>
                  <a
                    href={c.inputUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-normal text-primary hover:underline"
                  >
                    {c.inputUrl.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
                  </a>
                  {c.extraction === "basic" && (
                    <div className="mt-1 text-xs font-normal text-warning">
                      Rule-based extraction (LLM unavailable)
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELD_KEYS.map((k) => (
              <tr key={k} className="border-t border-border">
                <th scope="row" className="p-4 text-left align-top font-medium text-foreground">
                  {FIELD_LABELS[k]}
                </th>
                {cols.map((c) => (
                  <td key={c.inputUrl} className="p-4 align-top">
                    {!c.ok ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <FindingCell f={c.fields![k]} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-border bg-muted/50">
              <th scope="row" className="p-4 text-left align-top font-medium text-foreground">
                Pages researched
              </th>
              {cols.map((c) => (
                <td key={c.inputUrl} className="p-4 align-top">
                  {!c.ok ? (
                    <div className="flex items-start gap-2 text-destructive">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>Couldn't load this website: {c.error}</span>
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {c.pages.map((p) => (
                        <li key={p.url}>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-xs text-primary hover:underline"
                          >
                            {p.url.replace(/^https?:\/\//, "")}
                          </a>
                        </li>
                      ))}
                      {c.pageErrors.map((e) => (
                        <li key={e.url} className="text-xs text-muted-foreground">
                          Skipped {e.url.replace(/^https?:\/\//, "")}: {e.error}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <Analytics
        result={result}
        priorities={priorities}
        setPriorities={(next) => {
          setPriorities(next);
          setVerdict(null);
          setVerdictFor(null);
          setVerdictError(null);
        }}
      />

      <section
        aria-labelledby="ai-verdict-heading"
        className="rounded-2xl border border-border bg-card p-6 shadow-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 id="ai-verdict-heading" className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Gemini AI verdict
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              A separate recommendation grounded in this run’s source-backed TinyFish findings and
              your selected priorities.
            </p>
          </div>
          <Button variant="outline" disabled={checkingGemini} onClick={testGeminiConnection}>
            {checkingGemini ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {checkingGemini ? "Testing Gemini…" : "Test Gemini connection"}
          </Button>
          <Button variant="hero" disabled={!eligible || generatingVerdict} onClick={generate}>
            {generatingVerdict ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generatingVerdict
              ? "Generating verdict…"
              : verdict
                ? "Regenerate AI Verdict"
                : "Generate AI Verdict"}
          </Button>
        </div>
        {!eligible && (
          <p className="mt-4 text-sm text-muted-foreground">
            A verdict needs successful research for at least two competitors.
          </p>
        )}
        {checkingGemini && (
          <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
            Checking the server-side Gemini connection…
          </p>
        )}
        {geminiHealth && !checkingGemini && (
          <p
            role={geminiHealth.ok ? "status" : "alert"}
            className={`mt-4 text-sm ${geminiHealth.ok ? "text-success" : "text-destructive"}`}
          >
            {geminiHealth.ok
              ? `${geminiHealth.message} Model: ${geminiHealth.model}.`
              : geminiHealth.error}
          </p>
        )}
        {generatingVerdict && (
          <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
            Gemini is reviewing the verified findings and citations…
          </p>
        )}
        {verdictError && !generatingVerdict && (
          <div
            role="alert"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
          >
            <p className="text-sm text-destructive">{verdictError}</p>
            <Button variant="outline" size="sm" onClick={generate}>
              <RotateCcw className="h-4 w-4" /> Retry
            </Button>
          </div>
        )}
        {verdict && verdictFor === prioritySignature && !generatingVerdict && (
          <VerdictView verdict={verdict} />
        )}
      </section>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Key differences
        </h3>
        {result.summary ? (
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground">
            {result.summary
              .split("\n")
              .map((l) => l.replace(/^[-*•]\s*/, "").trim())
              .filter(Boolean)
              .map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{renderBold(l)}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{result.summaryNote}</p>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Summary is based only on the findings above. Verify important details on the linked
          sources.
        </p>
        {result.summaryNote && (
          <p className="mt-2 text-xs text-muted-foreground">{result.summaryNote}</p>
        )}
      </div>
    </div>
  );
}

function Analytics({
  result,
  priorities,
  setPriorities,
}: {
  result: CompareResponse;
  priorities: string[];
  setPriorities: (priorities: string[]) => void;
}) {
  const priorityFields = [
    ["pricing", "published_pricing", "Published price"],
    ["features", "main_features", "Features"],
    ["integrations", "integrations", "Integrations"],
    ["ai", "ai_capabilities", "AI capabilities"],
    ["collaboration", "collaboration", "Collaboration"],
    ["security", "security_claims", "Security requirements"],
  ] as const;
  const chosen = priorityFields.filter(([id]) => priorities.includes(id));
  const recommendationScores = rankByEvidencePriorities(
    result.competitors,
    chosen.map(([, key]) => key as FieldKey),
  );
  const recommendation = recommendationScores[0];
  const tiedRecommendations = recommendationScores.filter(
    (candidate) => candidate.score === recommendation?.score,
  );
  const data = result.competitors.map((c) => {
    const findings = c.fields ? Object.values(c.fields) : [];
    return {
      name: c.name,
      pages: c.pages.length,
      backed: findings.filter((f) => f.value && f.sourceUrl).length,
      unavailable: findings.filter((f) => f.status === "not_found").length,
      uncertain: findings.filter((f) => f.status === "uncertain").length,
      failed: c.pageErrors.length + (c.searchError ? 1 : 0) + (c.ok ? 0 : 1),
    };
  });
  const featureRows = [
    ...new Set(
      result.competitors.flatMap(
        (competitor) =>
          competitor.fields?.main_features.value
            ?.split(/;\s*/)
            .map((value) => value.trim())
            .filter(Boolean) ?? [],
      ),
    ),
  ];
  const namedIntegrations = result.competitors.map((competitor) => {
    const integrationFinding = competitor.fields?.integrations;
    const value = integrationFinding?.value ?? "";
    const explicitlyListed = /\b(integrations?|integrates? with|connects? to)\b/i.test(
      integrationFinding?.evidenceExcerpt ?? value,
    );
    const names = value.split(/;\s*/).flatMap((statement) => {
      const match = statement.match(
        /(?:integrations?\s+(?:include|with)|integrates?\s+with|connects?\s+to)\s+(.+)/i,
      );
      if (match)
        return (match[1] ?? "")
          .split(/,|\band\b/i)
          .map((name) => name.trim().replace(/[. ]+$/, ""))
          .filter(Boolean);
      return explicitlyListed ? [statement.trim().replace(/[. ]+$/, "")].filter(Boolean) : [];
    });
    return { competitor, names: [...new Set(names)] };
  });
  const integrationCounts = new Map<string, number>();
  for (const item of namedIntegrations)
    for (const name of item.names)
      integrationCounts.set(
        name.toLowerCase(),
        (integrationCounts.get(name.toLowerCase()) ?? 0) + 1,
      );
  return (
    <section aria-labelledby="analytics-heading" className="space-y-5">
      <div>
        <h3 id="analytics-heading" className="text-xl font-semibold">
          Research analytics
        </h3>
        <p className="text-sm text-muted-foreground">
          Counts reflect this run’s retrieved pages and source-backed findings. Coverage describes
          research completeness, not product quality.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h4 className="font-medium">Research coverage</h4>
          <div className="mt-4 h-64" role="img" aria-label="Research coverage chart by competitor">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} width={28} />
                <Tooltip />
                <Bar
                  dataKey="pages"
                  name="Pages retrieved"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="backed"
                  name="Source-backed findings"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="unavailable"
                  name="Not found in retrieved pages"
                  fill="var(--chart-4)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="uncertain"
                  name="Uncertain findings"
                  fill="var(--chart-3)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="failed"
                  name="Failed retrievals"
                  fill="var(--chart-5)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h4 className="font-medium">Research activity</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Completed {new Date(result.generatedAt).toLocaleString()}
          </p>
          <ul className="mt-4 space-y-4">
            {result.competitors.map((c) => (
              <li
                key={c.inputUrl}
                className="border-t border-border pt-3 first:border-0 first:pt-0"
              >
                <p className="font-medium">
                  {c.name}{" "}
                  <span className={c.ok ? "text-xs text-success" : "text-xs text-destructive"}>
                    {c.ok ? "Retrieved" : "Failed"}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.discoveredPages?.length ?? c.pages.length} pages discovered
                </p>
                {c.startedAt && (
                  <p className="text-xs text-muted-foreground">
                    Started {new Date(c.startedAt).toLocaleTimeString()}
                  </p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.pages.length} page(s) retrieved · {c.pageErrors.length} failed · extraction:{" "}
                  {c.extraction ?? "not run"}
                </p>
                {c.searchError && (
                  <p className="mt-1 text-xs text-destructive">Search failed: {c.searchError}</p>
                )}
                {c.error && <p className="mt-1 text-sm text-destructive">{c.error}</p>}
                {c.pageErrors.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {c.pageErrors.map((e) => (
                      <li key={`${e.url}-${e.error}`}>
                        Failed: {e.url} — {e.error}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-2xl border border-border bg-card p-5 shadow-card">
          <h4 className="font-medium">Feature coverage</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Features are statements found in retrieved content. An unlisted feature is unknown, not
            unsupported.
          </p>
          {featureRows.length ? (
            <table className="mt-4 w-full min-w-[460px] text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">Listed feature</th>
                  {result.competitors.map((c) => (
                    <th key={c.inputUrl} className="p-2 text-left">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureRows.map((feature) => (
                  <tr key={feature} className="border-t border-border">
                    <th className="p-2 text-left font-normal">{feature}</th>
                    {result.competitors.map((c) => {
                      const finding = c.fields?.main_features;
                      const present = !!finding?.value
                        ?.split(/;\s*/)
                        .some((value) => value.trim().toLowerCase() === feature.toLowerCase());
                      return (
                        <td key={c.inputUrl} className="p-2 align-top">
                          {present && finding ? (
                            <details>
                              <summary className="cursor-pointer text-success">Listed</summary>
                              <div className="mt-1 max-w-64 rounded border border-border p-2 text-xs">
                                {finding.value}
                                <br />
                                <a
                                  className="text-primary underline"
                                  href={finding.sourceUrl ?? undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Evidence source
                                </a>
                              </div>
                            </details>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No feature statements were extracted from the retrieved pages.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h4 className="font-medium">Integration ecosystem</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Only names explicitly introduced as integrations are counted. Common means listed by at
            least two researched competitors.
          </p>
          {namedIntegrations.some((item) => item.names.length) ? (
            <ul className="mt-4 space-y-3">
              {namedIntegrations.map(({ competitor, names }) => (
                <li key={competitor.inputUrl}>
                  <p className="text-sm font-medium">{competitor.name}</p>
                  {names.length ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {names.map((name) => (
                        <span key={name} className="rounded-full bg-secondary px-2 py-1 text-xs">
                          {name} ·{" "}
                          {integrationCounts.get(name.toLowerCase())! > 1
                            ? "Common"
                            : "Unique in this comparison"}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No explicitly named integrations found.
                    </p>
                  )}
                  {competitor.fields?.integrations.sourceUrl && (
                    <a
                      href={competitor.fields.integrations.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline"
                    >
                      Source <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No integration names could be reliably separated from the retrieved statements.
            </p>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h4 className="font-medium">Best Fit for Your Needs</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          This identifies the competitor with the strongest evidence coverage for your selected
          priorities. It is a documentation score, not a product-quality ranking.
        </p>
        <fieldset className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          <legend className="sr-only">Choose comparison priorities</legend>
          {priorityFields.map(([id, , label]) => (
            <label key={id} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={priorities.includes(id)}
                onChange={(event) =>
                  setPriorities(
                    event.target.checked
                      ? [...priorities, id]
                      : priorities.filter((item) => item !== id),
                  )
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        {chosen.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Choose at least one priority.</p>
        ) : recommendation && recommendation.score > 0 ? (
          <div className="mt-4 border-t border-border pt-4">
            <p className="font-semibold">
              {recommendation.competitor.name} · {recommendation.supported.length}/{chosen.length}{" "}
              evidence coverage
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Method: each selected priority has equal weight. A priority counts only when the A
              source-linked found claim counts 1, an uncertain source-linked excerpt counts 0.5, and
              missing evidence counts 0. This is a documentation score, not product quality.
            </p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {recommendation.matched.map(({ key, status, sourceUrl }) => {
                const label = priorityFields.find(([, field]) => field === key)?.[2] ?? key;
                return (
                  <li key={key} className="text-sm">
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {label} evidence ({status}) <ExternalLink className="inline h-3 w-3" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No selected priority has verified sourced evidence yet. Review the linked uncertain
            findings before deciding.
          </p>
        )}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h4 className="font-medium">Pricing comparison</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            No numeric chart is shown until prices can be normalized by currency, billing period,
            and unit. Unverified amounts are excluded.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h4 className="font-medium">Capability radar</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Capability scores are unavailable because this run does not yet produce normalized,
            evidence-counted scores for all five dimensions. Missing information is not scored as
            low capability.
          </p>
        </div>
      </div>
    </section>
  );
}

function VerdictView({ verdict }: { verdict: Verdict }) {
  return (
    <div className="mt-6 space-y-6 border-t border-border pt-6">
      <div className="rounded-xl bg-muted/50 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {verdict.status === "insufficient_evidence"
              ? "Insufficient evidence"
              : "Overall verdict"}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize">
            {verdict.overallVerdict.confidence} confidence
          </span>
        </div>
        <h4 className="mt-2 text-xl font-semibold">
          {verdict.overallVerdict.winner ? `${verdict.overallVerdict.winner}: ` : ""}
          {verdict.overallVerdict.headline}
        </h4>
        <p className="mt-2 text-sm leading-relaxed">{verdict.overallVerdict.reasoning}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Confidence: {verdict.overallVerdict.confidenceReason}
        </p>
      </div>
      {verdict.priorityRecommendations.length > 0 && (
        <div>
          <h4 className="font-semibold">Recommendations by priority</h4>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {verdict.priorityRecommendations.map((item) => (
              <li key={item.priority} className="rounded-lg border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.priority}
                </p>
                <p className="mt-1 font-medium">{item.winner ?? "No clear winner"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                <EvidenceLinks urls={item.evidenceUrls} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h4 className="font-semibold">Strengths, trade-offs and gaps</h4>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {verdict.competitorAnalysis.map((competitor) => (
            <article key={competitor.name} className="rounded-lg border border-border p-4">
              <h5 className="font-semibold">{competitor.name}</h5>
              <p className="mt-2 text-sm">
                <strong>Best for:</strong> {competitor.bestFor}
              </p>
              <p className="mt-1 text-sm">
                <strong>Pricing:</strong> {competitor.pricingAssessment}
              </p>
              {competitor.strengths.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-success">
                    Supported strengths
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {competitor.strengths.map((claim, index) => (
                      <li key={`${claim.claim}-${index}`}>
                        {claim.claim}
                        <EvidenceLinks urls={claim.evidenceUrls} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {competitor.weaknesses.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-warning">
                    Limitations and trade-offs
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {competitor.weaknesses.map((claim, index) => (
                      <li key={`${claim.claim}-${index}`}>
                        {claim.claim}
                        <EvidenceLinks urls={claim.evidenceUrls} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {competitor.missingInformation.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  <strong>Not verified:</strong> {competitor.missingInformation.join(" · ")}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h4 className="font-semibold">Key differences</h4>
          {verdict.keyDifferences.length ? (
            <ul className="mt-2 space-y-3">
              {verdict.keyDifferences.map((item, index) => (
                <li key={`${item.difference}-${index}`} className="text-sm">
                  <p className="font-medium">
                    {item.difference}
                    {item.winner ? ` · ${item.winner}` : ""}
                  </p>
                  <p className="text-muted-foreground">{item.explanation}</p>
                  <EvidenceLinks urls={item.evidenceUrls} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No clear source-backed differences were identified.
            </p>
          )}
        </div>
        <div>
          <h4 className="font-semibold">Risks and unknowns</h4>
          {verdict.risksAndUnknowns.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {verdict.risksAndUnknowns.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No additional risks were returned.</p>
          )}
          <h4 className="mt-4 font-semibold">What to investigate next</h4>
          {verdict.nextSteps.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {verdict.nextSteps.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No follow-up steps suggested.</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Verdict text is Gemini-generated from this comparison’s verified findings. Check linked
        evidence before acting; unknown information is not treated as a product weakness.
      </p>
    </div>
  );
}

function EvidenceLinks({ urls }: { urls: string[] }) {
  if (!urls.length)
    return <span className="ml-1 text-xs text-muted-foreground">No verified citation</span>;
  return (
    <span className="ml-1 inline-flex flex-wrap gap-x-2">
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline"
        >
          Evidence <ExternalLink className="inline h-3 w-3" />
        </a>
      ))}
    </span>
  );
}

function renderBold(text: string) {
  return text.split(/(https?:\/\/[^\s)]+|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("http://") || part.startsWith("https://"))
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-primary underline"
        >
          Source <ExternalLink className="inline h-3 w-3" />
        </a>
      );
    return part.startsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

function FindingCell({ f }: { f: Finding }) {
  if (f.status !== "found" && f.status !== "uncertain")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
        <HelpCircle className="h-3.5 w-3.5" />
        {f.status === "retrieval_failed"
          ? "Retrieval failed"
          : f.status === "not_researched"
            ? "Not researched"
            : "Not found in retrieved pages"}
      </span>
    );
  return (
    <div className="space-y-2">
      <p className="leading-relaxed text-foreground">{f.value}</p>
      <div className="flex flex-wrap items-center gap-2">
        {f.status === "uncertain" && (
          <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
            Uncertain
          </span>
        )}
        {f.sourceUrl ? (
          <details className="text-xs">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-primary hover:underline">
              Evidence and source
            </summary>
            <div className="mt-2 space-y-1 rounded-md border border-border bg-muted/40 p-2">
              <p className="text-foreground">{f.evidenceExcerpt ?? f.value}</p>
              {f.extractedAt && (
                <p className="text-muted-foreground">
                  Extracted {new Date(f.extractedAt).toLocaleString()}
                </p>
              )}
              <a
                href={f.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                {f.sourceUrl} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          </details>
        ) : (
          <span className="text-xs text-muted-foreground">Source unverified</span>
        )}
      </div>
    </div>
  );
}
