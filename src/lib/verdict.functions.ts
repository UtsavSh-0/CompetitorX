import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Verdict } from "./verdict.types";

const requestSchema = z.object({
  researchToken: z.string().min(20).max(50_000),
  priorities: z
    .array(z.enum(["pricing", "features", "integrations", "ai", "collaboration", "security"]))
    .max(6),
});

export const generateVerdict = createServerFn({ method: "POST" })
  .validator((input: unknown) => requestSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ ok: true; verdict: Verdict } | { ok: false; error: string }> => {
      const { generateEvidenceVerdict, VerdictError } = await import("./verdict.server");
      try {
        return {
          ok: true,
          verdict: await generateEvidenceVerdict(data.researchToken, data.priorities),
        };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof VerdictError
              ? error.message
              : "Gemini couldn't generate the verdict. Please retry.",
        };
      }
    },
  );
