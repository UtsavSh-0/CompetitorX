import type { CompetitorResult, FieldKey, FindingStatus } from "./compare.types";

export interface EvidencePriorityScore {
  competitor: CompetitorResult;
  score: number;
  matched: { key: FieldKey; status: FindingStatus; sourceUrl: string }[];
  supported: { key: FieldKey; status: FindingStatus; sourceUrl: string }[];
}

/** Equal-weight evidence coverage: verified claims count 1, uncertain sourced claims 0.5, unknown 0. */
export function rankByEvidencePriorities(
  competitors: CompetitorResult[],
  priorities: FieldKey[],
): EvidencePriorityScore[] {
  return competitors
    .map((competitor) => {
      const matched = priorities.flatMap((key) => {
        const finding = competitor.fields?.[key];
        if (
          !finding?.value ||
          !finding.sourceUrl ||
          !["found", "uncertain"].includes(finding.status)
        )
          return [];
        return [{ key, status: finding.status, sourceUrl: finding.sourceUrl }];
      });
      const total = priorities.reduce((score, key) => {
        const finding = competitor.fields?.[key];
        if (!finding?.value || !finding.sourceUrl) return score;
        return score + (finding.status === "found" ? 1 : finding.status === "uncertain" ? 0.5 : 0);
      }, 0);
      return {
        competitor,
        matched,
        supported: matched,
        score: priorities.length ? total / priorities.length : 0,
      };
    })
    .sort((a, b) => b.score - a.score);
}
