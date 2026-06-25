// Extract the client IP server-side from request headers. On Vercel the real
// client IP is in `x-forwarded-for` (first hop) or `x-real-ip`. Never trust a
// client-supplied body value for this.
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // May be a comma-separated list; the left-most is the original client.
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip");
}
