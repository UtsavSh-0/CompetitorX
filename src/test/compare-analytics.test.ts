import { describe, expect, it } from "vitest";
import { rankByEvidencePriorities } from "@/lib/compare.analytics";
import type { CompetitorResult } from "@/lib/compare.types";

const competitor = (name: string, fields: CompetitorResult["fields"]): CompetitorResult => ({
  inputUrl: `https://${name.toLowerCase()}.example/`,
  name,
  ok: true,
  error: null,
  pages: [],
  pageErrors: [],
  fields,
  extraction: "ai",
});

describe("rankByEvidencePriorities", () => {
  it("changes the leading competitor when the selected evidence priority changes", () => {
    const alpha = competitor("Alpha", {
      core_offering: { value: null, status: "not_found", sourceUrl: null },
      main_features: {
        value: "Roadmaps",
        status: "found",
        sourceUrl: "https://alpha.example/features",
      },
      target_audience: { value: null, status: "not_found", sourceUrl: null },
      services: { value: null, status: "not_found", sourceUrl: null },
      published_pricing: { value: null, status: "not_found", sourceUrl: null },
      key_differentiators: { value: null, status: "not_found", sourceUrl: null },
      integrations: { value: null, status: "not_found", sourceUrl: null },
      ai_capabilities: { value: null, status: "not_found", sourceUrl: null },
      collaboration: { value: null, status: "not_found", sourceUrl: null },
      security_claims: { value: null, status: "not_found", sourceUrl: null },
    });
    const beta = competitor("Beta", {
      ...alpha.fields!,
      main_features: { value: null, status: "not_found", sourceUrl: null },
      integrations: {
        value: "Slack",
        status: "found",
        sourceUrl: "https://beta.example/integrations",
      },
    });

    expect(rankByEvidencePriorities([alpha, beta], ["main_features"])[0]!.competitor.name).toBe(
      "Alpha",
    );
    expect(rankByEvidencePriorities([alpha, beta], ["integrations"])[0]!.competitor.name).toBe(
      "Beta",
    );
  });

  it("weights uncertain sourced evidence below verified evidence and ignores missing evidence", () => {
    const uncertain = competitor("Uncertain", {
      core_offering: { value: null, status: "not_found", sourceUrl: null },
      main_features: {
        value: "Roadmaps",
        status: "uncertain",
        sourceUrl: "https://u.example/features",
      },
      target_audience: { value: null, status: "not_found", sourceUrl: null },
      services: { value: null, status: "not_found", sourceUrl: null },
      published_pricing: { value: null, status: "not_found", sourceUrl: null },
      key_differentiators: { value: null, status: "not_found", sourceUrl: null },
      integrations: { value: null, status: "not_found", sourceUrl: null },
      ai_capabilities: { value: null, status: "not_found", sourceUrl: null },
      collaboration: { value: null, status: "not_found", sourceUrl: null },
      security_claims: { value: null, status: "not_found", sourceUrl: null },
    });
    const result = rankByEvidencePriorities([uncertain], ["main_features", "integrations"])[0]!;
    expect(result.score).toBe(0.25);
    expect(result.matched).toHaveLength(1);
  });
});
