import { z } from "zod";

const citedClaimSchema = z.object({
  claim: z.string().min(1).max(400),
  evidenceUrls: z.array(z.string().url()).max(5),
});

export const verdictSchema = z.object({
  status: z.enum(["success", "insufficient_evidence"]),
  overallVerdict: z.object({
    winner: z.string().nullable(),
    headline: z.string().min(1).max(240),
    reasoning: z.string().min(1).max(1200),
    confidence: z.enum(["high", "medium", "low"]),
    confidenceReason: z.string().min(1).max(500),
  }),
  priorityRecommendations: z
    .array(
      z.object({
        priority: z.string().min(1).max(80),
        winner: z.string().nullable(),
        reason: z.string().min(1).max(500),
        evidenceUrls: z.array(z.string().url()).max(5),
      }),
    )
    .max(6),
  competitorAnalysis: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        strengths: z.array(citedClaimSchema).max(5),
        weaknesses: z.array(citedClaimSchema).max(5),
        bestFor: z.string().min(1).max(400),
        pricingAssessment: z.string().min(1).max(400),
        missingInformation: z.array(z.string().max(240)).max(8),
      }),
    )
    .min(2)
    .max(3),
  keyDifferences: z
    .array(
      z.object({
        difference: z.string().min(1).max(300),
        winner: z.string().nullable(),
        explanation: z.string().min(1).max(500),
        evidenceUrls: z.array(z.string().url()).max(5),
      }),
    )
    .max(8),
  risksAndUnknowns: z.array(z.string().max(300)).max(8),
  nextSteps: z.array(z.string().max(300)).max(6),
});

export type Verdict = z.infer<typeof verdictSchema>;

export const verdictJsonSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["success", "insufficient_evidence"] },
    overallVerdict: {
      type: "object",
      properties: {
        winner: { type: ["string", "null"] },
        headline: { type: "string" },
        reasoning: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        confidenceReason: { type: "string" },
      },
      required: ["winner", "headline", "reasoning", "confidence", "confidenceReason"],
    },
    priorityRecommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          priority: { type: "string" },
          winner: { type: ["string", "null"] },
          reason: { type: "string" },
          evidenceUrls: { type: "array", items: { type: "string" } },
        },
        required: ["priority", "winner", "reason", "evidenceUrls"],
      },
    },
    competitorAnalysis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          strengths: {
            type: "array",
            items: {
              type: "object",
              properties: {
                claim: { type: "string" },
                evidenceUrls: { type: "array", items: { type: "string" } },
              },
              required: ["claim", "evidenceUrls"],
            },
          },
          weaknesses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                claim: { type: "string" },
                evidenceUrls: { type: "array", items: { type: "string" } },
              },
              required: ["claim", "evidenceUrls"],
            },
          },
          bestFor: { type: "string" },
          pricingAssessment: { type: "string" },
          missingInformation: { type: "array", items: { type: "string" } },
        },
        required: [
          "name",
          "strengths",
          "weaknesses",
          "bestFor",
          "pricingAssessment",
          "missingInformation",
        ],
      },
    },
    keyDifferences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          difference: { type: "string" },
          winner: { type: ["string", "null"] },
          explanation: { type: "string" },
          evidenceUrls: { type: "array", items: { type: "string" } },
        },
        required: ["difference", "winner", "explanation", "evidenceUrls"],
      },
    },
    risksAndUnknowns: { type: "array", items: { type: "string" } },
    nextSteps: { type: "array", items: { type: "string" } },
  },
  required: [
    "status",
    "overallVerdict",
    "priorityRecommendations",
    "competitorAnalysis",
    "keyDifferences",
    "risksAndUnknowns",
    "nextSteps",
  ],
} as const;
