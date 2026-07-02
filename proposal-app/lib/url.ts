export function getRequestOrigin(req: Request) {
  const requestUrl = new URL(req.url);
  const forwardedHost = firstForwardedValue(req.headers.get("x-forwarded-host"));
  const forwardedProto = firstForwardedValue(req.headers.get("x-forwarded-proto"));

  if (!forwardedHost) {
    return requestUrl.origin;
  }

  const proto = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : requestUrl.protocol.replace(/:$/, "");

  return `${proto}://${forwardedHost}`;
}

export function absoluteUrlForOrigin(pathOrUrl: string, origin: string) {
  return new URL(pathOrUrl, origin).toString();
}

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}
