import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import { z } from "zod";
import {
  FIELD_KEYS,
  type CompareResponse,
  type CompetitorResult,
  type FieldKey,
  type Finding,
  type SourcePage,
} from "./compare.types";

const FETCH_URL = "https://api.fetch.tinyfish.ai";
const SEARCH_URL = "https://api.search.tinyfish.ai";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const FETCH_ERROR_TEXT: Record<string, string> = {
  target_http_error: "The website returned an error",
  page_not_found: "Page not found",
  target_unreachable: "The website could not be reached",
  timeout: "The website took too long to respond",
  bot_blocked: "The website blocked automated access",
  empty_content: "No readable text on the page",
  login_required: "The page requires a login",
  content_too_large: "The page is too large",
  invalid_url: "The address was rejected",
  invalid_redirect_url: "The website redirected to a disallowed address",
  proxy_error: "Network error while loading the page",
};

export class TinyFishError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function describeHttp(status: number): string {
  if (status === 401) return "The TinyFish API key is missing or invalid.";
  if (status === 402) return "TinyFish credits are used up for today.";
  if (status === 429) return "TinyFish rate limit reached — please retry in a minute.";
  if (status >= 500) return "TinyFish is temporarily unavailable — please retry.";
  return `TinyFish request failed (HTTP ${status}).`;
}

interface FetchedPage {
  url: string;
  finalUrl: string;
  title: string | null;
  description: string | null;
  text: string;
  links: string[];
}

async function tinyfishFetch(apiKey: string, urls: string[], links: boolean) {
  const res = await fetch(FETCH_URL, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      urls,
      format: "markdown",
      links,
      per_url_timeout_ms: 30000,
      purpose: "Compare products, features, audiences, services and public pricing across competitor websites",
    }),
    signal: AbortSignal.timeout(50000),
  });
  if (!res.ok) throw new TinyFishError(res.status, describeHttp(res.status));
  const json = (await res.json()) as { results?: unknown[]; errors?: unknown[] };
  const pages: FetchedPage[] = [];
  for (const r of Array.isArray(json.results) ? json.results : []) {
    const o = r as { url?: unknown; final_url?: unknown; title?: unknown; description?: unknown; text?: unknown; links?: unknown };
    if (typeof o.url !== "string") continue;
    pages.push({
      url: o.url,
      finalUrl: typeof o.final_url === "string" ? o.final_url : o.url,
      title: typeof o.title === "string" ? o.title : null,
      description: typeof o.description === "string" ? o.description : null,
      text: typeof o.text === "string" ? o.text : "",
      links: Array.isArray(o.links) ? o.links.filter((l): l is string => typeof l === "string") : [],
    });
  }
  const errors: { url: string; error: string }[] = [];
  for (const e of Array.isArray(json.errors) ? json.errors : []) {
    const o = e as { url?: unknown; error?: unknown; status?: unknown };
    const code = typeof o.error === "string" ? o.error : "unknown";
    const status = typeof o.status === "number" ? ` (${o.status})` : "";
    errors.push({ url: String(o.url ?? ""), error: (FETCH_ERROR_TEXT[code] ?? "Could not load the page") + status });
  }
  return { pages, errors };
}

async function tinyfishSearch(apiKey: string, query: string, domain: string): Promise<string[]> {
  try {
    const params = new URLSearchParams({ query, include_domains: domain });
    const res = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.error("TinyFish search failed", res.status);
      return [];
    }
    const json = (await res.json()) as { results?: { url?: unknown }[] };
    return (json.results ?? []).map((r) => r.url).filter((u): u is string => typeof u === "string");
  } catch (e) {
    console.error("TinyFish search error", e);
    return [];
  }
}

const baseDomain = (host: string) => host.replace(/^www\./, "").toLowerCase();

function pickRelevantLinks(links: string[], domain: string, exclude: Set<string>): string[] {
  const patterns: [RegExp, number][] = [
    [/pric|plans/, 10],
    [/feature/, 8],
    [/product|platform/, 6],
    [/service|solution/, 6],
    [/about|why|customers/, 3],
  ];
  const scored = new Map<string, number>();
  for (const l of links) {
    let u: URL;
    try {
      u = new URL(l);
    } catch {
      continue;
    }
    if (baseDomain(u.hostname) !== domain || !/^https?:$/.test(u.protocol)) continue;
    u.hash = "";
    u.search = "";
    const path = u.pathname.toLowerCase();
    if (path.split("/").filter(Boolean).length > 2) continue;
    if (/blog|careers|jobs|legal|privacy|terms|login|signin|signup|docs|changelog/.test(path)) continue;
    const key = u.toString().replace(/\/$/, "");
    if (exclude.has(key)) continue;
    const score = patterns.find(([re]) => re.test(path))?.[1] ?? 0;
    if (score > 0) scored.set(key, Math.max(scored.get(key) ?? 0, score));
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1]).map(([u]) => u);
}

const findingSchema = z.object({
  value: z.string().nullable(),
  status: z.enum(["found", "uncertain", "unavailable"]),
  source_url: z.string().nullable(),
});
const extractionSchema = z.object({
  company_name: z.string(),
  core_offering: findingSchema,
  main_features: findingSchema,
  target_audience: findingSchema,
  services: findingSchema,
  published_pricing: findingSchema,
  key_differentiators: findingSchema,
  integrations: findingSchema,
  ai_capabilities: findingSchema,
  collaboration: findingSchema,
  security_claims: findingSchema,
});

function makeProvider(apiKey: string) {
  return createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}

const openaiOptions = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

async function aiExtract(aiKey: string, pages: FetchedPage[]) {
  const corpus = pages
    .map((p) => `### SOURCE: ${p.finalUrl}\nTitle: ${p.title ?? ""}\nDescription: ${p.description ?? ""}\n\n${p.text.slice(0, 9000)}`)
    .join("\n\n---\n\n");
  const result = streamText({
    model: makeProvider(aiKey).responses(MODEL),
    instructions:
      "You extract competitive intelligence ONLY from the provided website content. Never use outside knowledge or guess. " +
      "For each field: value is a concise summary (features/services/differentiators as a short '; '-separated list, max ~40 words). " +
      "status 'found' when clearly stated, 'uncertain' when only implied, 'unavailable' when not present (value null). " +
      "For published_pricing, quote plan names and exact prices exactly as written; if no prices appear, mark unavailable. " +
      "For integrations, list only named integrations explicitly stated in the supplied page content. " +
      "source_url must be exactly one of the SOURCE URLs where the evidence appears.",
    messages: [{ role: "user", content: corpus }],
    output: Output.object({ schema: extractionSchema }),
    providerOptions: openaiOptions,
  });
  return await result.output;
}

function basicExtract(pages: FetchedPage[]): Record<FieldKey, Finding> {
  const empty = (): Finding => ({ value: null, status: "unavailable", sourceUrl: null });
  const fields = Object.fromEntries(FIELD_KEYS.map((k) => [k, empty()])) as Record<FieldKey, Finding>;
  const home = pages[0];
  if (home?.description) fields.core_offering = { value: home.description, status: "uncertain", sourceUrl: home.finalUrl };
  for (const p of pages) {
    const lines = p.text.split("\n").filter((l) => /[$€£₹]\s?\d/.test(l)).map((l) => l.replace(/[#*|_]/g, " ").trim());
    if (lines.length) {
      fields.published_pricing = { value: lines.slice(0, 5).join("; ").slice(0, 400), status: "uncertain", sourceUrl: p.finalUrl };
      break;
    }
  }
  // The fallback cannot reliably associate currency values with plans and billing units.
  // Avoid promoting stray numbers from marketing copy to a pricing claim.
  fields.published_pricing = empty();
  return fields;
}

async function researchCompetitor(tfKey: string, aiKey: string | undefined, inputUrl: string): Promise<CompetitorResult> {
  const domain = baseDomain(new URL(inputUrl).hostname);
  const result: CompetitorResult = {
    inputUrl,
    name: domain,
    ok: false,
    error: null,
    pages: [],
    pageErrors: [],
    fields: null,
    extraction: null,
  };

  const [home, searchUrls] = await Promise.all([
    tinyfishFetch(tfKey, [inputUrl], true),
    tinyfishSearch(tfKey, `${domain} pricing plans features`, domain),
  ]);
  result.pageErrors.push(...home.errors);
  const homePage = home.pages[0];
  if (!homePage || !homePage.text.trim()) {
    result.error = home.errors[0]?.error ?? "The website returned no readable content.";
    return result;
  }

  const seen = new Set([homePage.url, homePage.finalUrl].map((u) => u.replace(/\/$/, "")));
  const candidates = pickRelevantLinks([...homePage.links, ...searchUrls], domain, seen).slice(0, 3);
  const pages: FetchedPage[] = [homePage];
  if (candidates.length) {
    try {
      const extra = await tinyfishFetch(tfKey, candidates, false);
      pages.push(...extra.pages.filter((p) => p.text.trim()));
      result.pageErrors.push(...extra.errors);
    } catch (e) {
      result.pageErrors.push({ url: candidates.join(", "), error: e instanceof Error ? e.message : "Fetch failed" });
    }
  }
  result.pages = pages.map<SourcePage>((p) => ({ url: p.finalUrl, title: p.title }));
  result.ok = true;

  const allowed = new Set(pages.flatMap((p) => [p.finalUrl, p.url]));
  if (aiKey) {
    try {
      const out = await aiExtract(aiKey, pages);
      result.name = out.company_name?.trim() || domain;
      result.fields = Object.fromEntries(
        FIELD_KEYS.map((k) => {
          const f = out[k];
          const hasValue = !!f.value?.trim() && f.status !== "unavailable";
          const src = f.source_url && allowed.has(f.source_url) ? f.source_url : null;
          return [
            k,
            hasValue
              ? { value: f.value!.trim(), status: src ? f.status : "uncertain", sourceUrl: src }
              : { value: null, status: "unavailable", sourceUrl: null },
          ];
        }),
      ) as Record<FieldKey, Finding>;
      result.extraction = "ai";
      return result;
    } catch (e) {
      console.error("AI extraction failed, using basic extraction", e);
    }
  }
  result.fields = basicExtract(pages);
  result.extraction = "basic";
  return result;
}

async function summarize(aiKey: string, competitors: CompetitorResult[]): Promise<string> {
  const data = competitors
    .filter((c) => c.ok && c.fields)
    .map((c) => ({
      name: c.name,
      ...Object.fromEntries(FIELD_KEYS.map((k) => [k, c.fields![k].value ?? "UNAVAILABLE"])),
    }));
  const result = streamText({
    model: makeProvider(aiKey).responses(MODEL),
    instructions:
      "Write a concise competitive summary (4-6 short bullet points starting with '- ') explaining the main differences. " +
      "Use only the given data; when something is UNAVAILABLE say it wasn't published rather than guessing.",
    messages: [{ role: "user", content: JSON.stringify(data) }],
    providerOptions: openaiOptions,
  });
  return (await result.text).trim();
}

function deterministicSummary(competitors: CompetitorResult[]): string | null {
  const available = competitors.filter((competitor) => competitor.ok && competitor.fields);
  if (available.length < 2) return null;
  const lines: string[] = [];
  for (const key of ["core_offering", "main_features", "published_pricing", "key_differentiators"] as const) {
    const values = available.flatMap((competitor) => {
      const finding = competitor.fields![key];
      return finding.value && finding.sourceUrl ? [`${competitor.name}: ${finding.value} (source: ${finding.sourceUrl})`] : [];
    });
    if (values.length > 1 && new Set(values).size > 1) lines.push(`${key.replaceAll("_", " ")}: ${values.join(" · ")}`);
  }
  const gaps = available.map((competitor) => {
    const missing = FIELD_KEYS.filter((key) => competitor.fields![key].status === "unavailable").length;
    return `${competitor.name}: ${missing} of ${FIELD_KEYS.length} fields unavailable`;
  });
  lines.push(`Evidence limitations: ${gaps.join("; ")}. These are research gaps, not confirmed product limitations.`);
  return lines.map((line) => `- ${line}`).join("\n");
}

export async function runComparison(urls: string[]): Promise<CompareResponse> {
  const tfKey = process.env["TINYFISH_API_KEY"];
  if (!tfKey) throw new TinyFishError(500, "The TinyFish API key hasn't been configured yet.");
  const aiKey = process.env["LOVABLE_API_KEY"];

  const competitors = await Promise.all(
    urls.map(async (u) => {
      try {
        return await researchCompetitor(tfKey, aiKey, u);
      } catch (e) {
        console.error("Research failed for", u, e);
        const msg =
          e instanceof TinyFishError
            ? e.message
            : e instanceof Error && e.name === "TimeoutError"
              ? "Research timed out for this website."
              : "Research failed for this website.";
        return {
          inputUrl: u,
          name: baseDomain(new URL(u).hostname),
          ok: false,
          error: msg,
          pages: [],
          pageErrors: [],
          fields: null,
          extraction: null,
        } satisfies CompetitorResult;
      }
    }),
  );

  let summary: string | null = null;
  let summaryNote: string | null = null;
  const okCount = competitors.filter((c) => c.ok).length;
  if (okCount < 2) summaryNote = "A comparison summary needs at least two websites with retrieved content.";
  else if (!aiKey || competitors.some((c) => c.extraction === "basic")) {
    summary = deterministicSummary(competitors);
    summaryNote = "AI summary unavailable — showing basic extraction only.";
  } else {
    try {
      summary = await summarize(aiKey, competitors);
      if (!summary) {
        summary = deterministicSummary(competitors);
        summaryNote = summary ? "Rule-based summary used because the AI summary was empty." : "Not enough source-backed findings are available to summarize differences.";
      }
    } catch (e) {
      console.error("Summary failed", e);
      summary = deterministicSummary(competitors);
      summaryNote = "The summary couldn't be generated this time.";
    }
  }
  return { competitors, summary, summaryNote, generatedAt: new Date().toISOString() };
}
