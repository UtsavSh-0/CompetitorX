/** Returns a normalized public http(s) URL, or an error message. */
export function validatePublicUrl(raw: string): { url: string } | { error: string } {
  let input = raw.trim();
  if (!input) return { error: "Please enter a website address." };
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) input = `https://${input}`;
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return { error: "That doesn't look like a valid website address." };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:")
    return { error: "Only http and https websites are supported." };
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !host.includes(".") ||
    [".local", ".localhost", ".internal", ".home.arpa", ".test", ".invalid"].some((suffix) =>
      host.endsWith(suffix),
    ) ||
    host === "localhost" ||
    host === "instance-data"
  )
    return { error: "Please use a public website address." };
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":") || host.startsWith("["))
    return { error: "IP addresses aren't supported — use a public domain name." };
  if (u.username || u.password) return { error: "Addresses with login details aren't allowed." };
  u.hash = "";
  return { url: u.toString() };
}
