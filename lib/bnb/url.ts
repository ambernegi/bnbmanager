export function sanitizeExternalUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    // Security: block javascript:, data:, file:, etc.
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

