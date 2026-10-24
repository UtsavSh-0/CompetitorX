import { describe, expect, it } from "vitest";
import { validatePublicUrl } from "@/lib/url-validation";

describe("validatePublicUrl", () => {
  it("accepts a public https site and adds https when missing", () => {
    expect(validatePublicUrl("linear.app")).toEqual({ url: "https://linear.app/" });
  });
  it("rejects non-http schemes", () => {
    expect("error" in validatePublicUrl("ftp://example.com")).toBe(true);
  });
  it("rejects localhost and IP addresses", () => {
    expect("error" in validatePublicUrl("http://localhost:3000")).toBe(true);
    expect("error" in validatePublicUrl("http://192.168.1.1")).toBe(true);
  });
});
