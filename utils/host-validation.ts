export function normalizeHost(host: string): string {
  let hostname = host.trim().toLowerCase().replace(/\.$/, "");

  if (hostname.startsWith("[")) {
    const bracketEnd = hostname.indexOf("]");
    return bracketEnd === -1 ? "" : hostname.slice(1, bracketEnd);
  }

  const colonCount = (hostname.match(/:/g) || []).length;
  if (colonCount === 1) {
    const lastColon = hostname.lastIndexOf(":");
    const afterColon = hostname.slice(lastColon + 1);
    if (/^\d+$/.test(afterColon)) {
      hostname = hostname.slice(0, lastColon);
    }
  }

  return hostname;
}

export function isLoopbackHost(host: string): boolean {
  const hostname = normalizeHost(host);
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

export function isDevelopmentHost(host: string): boolean {
  return process.env.NODE_ENV !== "production" && isLoopbackHost(host);
}