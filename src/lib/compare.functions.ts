import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { validatePublicUrl } from "./url-validation";
import type { CompareResponse } from "./compare.types";

export const compareWebsites = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const { urls } = z.object({ urls: z.array(z.string().max(2000)).min(2).max(3) }).parse(input);
    const normalized = urls.map((u) => {
      const r = validatePublicUrl(u);
      if ("error" in r) throw new Error(`${u}: ${r.error}`);
      return r.url;
    });
    if (new Set(normalized.map((u) => new URL(u).hostname.replace(/^www\./, ""))).size !== normalized.length)
      throw new Error("Please enter different websites to compare.");
    return { urls: normalized };
  })
  .handler(async ({ data }): Promise<{ ok: true; result: CompareResponse } | { ok: false; error: string }> => {
    const { runComparison, TinyFishError } = await import("./compare.server");
    try {
      return { ok: true, result: await runComparison(data.urls) };
    } catch (e) {
      console.error("compareWebsites failed", e);
      return { ok: false, error: e instanceof TinyFishError ? e.message : "Something went wrong during research. Please retry." };
    }
  });
