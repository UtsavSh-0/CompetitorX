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
import { FIELD_KEYS, FIELD_LABELS, type CompareResponse, type Finding } from "@/lib/compare.types";
import { validatePublicUrl } from "@/lib/url-validation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CompetitorX — Compare competitor websites with AI" },
      {
        name: "description",
        content: "Enter 2–3 websites and get a sourced comparison of offerings, features, audiences and public pricing.",
      },
      { property: "og:title", content: "CompetitorX — AI Competitive Intelligence" },
      { property: "og:description", content: "Live, sourced side-by-side comparisons of competitor websites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const EXAMPLES = [
  { label: "Linear vs Asana vs Monday", urls: ["https://linear.app", "https://asana.com", "https://monday.com"] },
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
    const errs = urls.map((u) => (u.trim() ? (("error" in validatePublicUrl(u) && (validatePublicUrl(u) as { error: string }).error) || null) : null));
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
      setFatal(msg.includes(":") && msg.length < 200 ? msg : "We couldn't reach the research service. Please retry.");
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
            Enter two or three websites. CompetitorX reads their official pages and builds a side-by-side matrix of
            offerings, features, audiences and published pricing — every finding linked to its source.
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
        <div ref={formRef} className="mx-auto max-w-3xl scroll-mt-8 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-xl font-semibold">Websites to compare</h2>
          <p className="mt-1 text-sm text-muted-foreground">Public http(s) addresses only. 2–3 competitors.</p>
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
                    <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Remove website" disabled={loading}
                      onClick={() => setUrls(urls.filter((_, j) => j !== i))}>
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
              <Button variant="ghost" size="sm" disabled={loading} onClick={() => setUrls([...urls, ""])}>
                <Plus className="h-4 w-4" /> Add a third website
              </Button>
            ) : <span />}
            <Button variant="hero" className="h-11 rounded-xl px-6" disabled={loading} onClick={submit}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Researching…" : "Compare Websites"}
            </Button>
          </div>
          <div className="mt-6 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Try an example</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex.label} disabled={loading}
                  onClick={() => { setUrls(ex.urls); setErrors([]); }}
                  className="rounded-full border border-border bg-secondary px-3 py-1 text-sm text-secondary-foreground transition hover:border-primary/40 disabled:opacity-50">
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-card" aria-live="polite">
            <p className="font-medium">Researching {urls.filter((u) => u.trim()).length} websites… this usually takes 30–90 seconds.</p>
            <p className="mt-3 text-sm text-muted-foreground">TinyFish is searching and retrieving public pages. Retrieved page and extraction details appear here when the request completes.</p>
          </div>
        )}

        {fatal && !loading && (
          <div role="alert" className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Comparison couldn't be completed</p>
              <p className="mt-1 text-sm text-muted-foreground">{fatal}</p>
            </div>
            <Button variant="outline" size="sm" onClick={submit}><RotateCcw className="h-4 w-4" /> Retry</Button>
          </div>
        )}

        {result && !loading && <Results result={result} onRetry={submit} />}
      </main>
    </div>
  );
}

function Results({ result, onRetry }: { result: CompareResponse; onRetry: () => void }) {
  const cols = result.competitors;
  return (
    <div className="mt-12 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Comparison matrix</h2>
          <p className="text-sm text-muted-foreground">Researched {new Date(result.generatedAt).toLocaleString()}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}><RotateCcw className="h-4 w-4" /> Run again</Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="w-44 p-4 text-left font-medium text-muted-foreground">Field</th>
              {cols.map((c) => (
                <th key={c.inputUrl} className="p-4 text-left align-top">
                  <div className="font-display text-base font-semibold text-foreground">{c.name}</div>
                  <a href={c.inputUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-normal text-primary hover:underline">
                    {c.inputUrl.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
                  </a>
                  {c.extraction === "basic" && <div className="mt-1 text-xs font-normal text-warning">Basic extraction (AI unavailable)</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELD_KEYS.map((k) => (
              <tr key={k} className="border-t border-border">
                <th scope="row" className="p-4 text-left align-top font-medium text-foreground">{FIELD_LABELS[k]}</th>
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
              <th scope="row" className="p-4 text-left align-top font-medium text-foreground">Pages researched</th>
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
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-primary hover:underline">
                            {p.url.replace(/^https?:\/\//, "")}
                          </a>
                        </li>
                      ))}
                      {c.pageErrors.map((e) => (
                        <li key={e.url} className="text-xs text-muted-foreground">Skipped {e.url.replace(/^https?:\/\//, "")}: {e.error}</li>
                      ))}
                    </ul>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <Analytics result={result} />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Key differences</h3>
        {result.summary ? (
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground">
            {result.summary.split("\n").map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean).map((l, i) => (
              <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><span>{renderBold(l)}</span></li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{result.summaryNote}</p>
        )}
        <p className="mt-4 text-xs text-muted-foreground">Summary is based only on the findings above. Verify important details on the linked sources.</p>
      </div>
    </div>
  );
}

function Analytics({ result }: { result: CompareResponse }) {
  const data = result.competitors.map((c) => {
    const findings = c.fields ? Object.values(c.fields) : [];
    return {
      name: c.name,
      pages: c.pages.length,
      backed: findings.filter((f) => f.value && f.sourceUrl).length,
      unavailable: findings.filter((f) => f.status === "unavailable").length,
      failed: c.pageErrors.length + (c.ok ? 0 : 1),
    };
  });
  return (
    <section aria-labelledby="analytics-heading" className="space-y-5">
      <div>
        <h3 id="analytics-heading" className="text-xl font-semibold">Research analytics</h3>
        <p className="text-sm text-muted-foreground">Counts reflect this run’s retrieved pages and source-backed findings. Coverage describes research completeness, not product quality.</p>
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
                <Bar dataKey="pages" name="Pages retrieved" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="backed" name="Source-backed findings" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unavailable" name="Unavailable fields" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed retrievals" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h4 className="font-medium">Research activity</h4>
          <p className="mt-1 text-xs text-muted-foreground">Completed {new Date(result.generatedAt).toLocaleString()}</p>
          <ul className="mt-4 space-y-4">
            {result.competitors.map((c) => (
              <li key={c.inputUrl} className="border-t border-border pt-3 first:border-0 first:pt-0">
                <p className="font-medium">{c.name} <span className={c.ok ? "text-xs text-success" : "text-xs text-destructive"}>{c.ok ? "Retrieved" : "Failed"}</span></p>
                <p className="mt-1 text-sm text-muted-foreground">{c.pages.length} page(s) retrieved · {c.pageErrors.length} failed · extraction: {c.extraction ?? "not run"}</p>
                {c.error && <p className="mt-1 text-sm text-destructive">{c.error}</p>}
                {c.pageErrors.length > 0 && <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{c.pageErrors.map((e) => <li key={`${e.url}-${e.error}`}>Failed: {e.url} — {e.error}</li>)}</ul>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function renderBold(text: string) {
  return text.split(/(https?:\/\/[^\s)]+|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("http://") || part.startsWith("https://"))
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">Source <ExternalLink className="inline h-3 w-3" /></a>;
    return part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>;
  });
}

function FindingCell({ f }: { f: Finding }) {
  if (f.status === "unavailable" || !f.value)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
        <HelpCircle className="h-3.5 w-3.5" /> Not published / unavailable
      </span>
    );
  return (
    <div className="space-y-2">
      <p className="leading-relaxed text-foreground">{f.value}</p>
      <div className="flex flex-wrap items-center gap-2">
        {f.status === "uncertain" && (
          <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">Uncertain</span>
        )}
        {f.sourceUrl ? (
          <details className="text-xs">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-primary hover:underline">Evidence and source</summary>
            <div className="mt-2 space-y-1 rounded-md border border-border bg-muted/40 p-2">
              <p className="text-foreground">{f.value}</p>
              <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-primary hover:underline">
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
