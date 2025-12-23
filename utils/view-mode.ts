export function preserveMapViewParam(
  targetUrl: string,
  currentSearch: string | URLSearchParams | null | undefined
): string {
  const currentParams =
    typeof currentSearch === "string"
      ? new URLSearchParams(
          currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch
        )
      : currentSearch ?? new URLSearchParams();

  if (currentParams.get("view") !== "map") {
    return targetUrl;
  }

  const parsed = new URL(targetUrl, "http://local");
  const params = new URLSearchParams(parsed.search);

  if (!params.has("view")) {
    params.set("view", "map");
  }

  const qs = params.toString();
  return `${parsed.pathname}${qs ? `?${qs}` : ""}${parsed.hash}`;
}
