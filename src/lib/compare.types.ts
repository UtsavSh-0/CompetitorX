export type FieldKey =
  | "core_offering"
  | "main_features"
  | "target_audience"
  | "services"
  | "published_pricing"
  | "key_differentiators"
  | "integrations"
  | "ai_capabilities"
  | "collaboration"
  | "security_claims";

export const FIELD_LABELS: Record<FieldKey, string> = {
  core_offering: "Core offering",
  main_features: "Main features",
  target_audience: "Target audience",
  services: "Services",
  published_pricing: "Published pricing",
  key_differentiators: "Key differentiators",
  integrations: "Listed integrations",
  ai_capabilities: "AI capabilities",
  collaboration: "Collaboration",
  security_claims: "Security information",
};

export const FIELD_KEYS = Object.keys(FIELD_LABELS) as FieldKey[];

export type FindingStatus =
  "found" | "uncertain" | "not_found" | "not_researched" | "retrieval_failed";

export interface Finding {
  value: string | null;
  status: FindingStatus;
  sourceUrl: string | null;
  evidenceExcerpt?: string | null;
  extractedAt?: string | null;
}

export interface SourcePage {
  url: string;
  title: string | null;
}

export interface CompetitorResult {
  inputUrl: string;
  name: string;
  startedAt?: string;
  ok: boolean;
  error: string | null;
  pages: SourcePage[];
  discoveredPages?: string[];
  pageErrors: { url: string; error: string }[];
  searchError?: string | null;
  fields: Record<FieldKey, Finding> | null;
  extraction: "ai" | "basic" | null;
}

export interface CompareResponse {
  competitors: CompetitorResult[];
  summary: string | null;
  summaryNote: string | null;
  generatedAt: string;
  researchToken?: string;
}
