export default function JsonLdServer({
  id,
  data,
  dangerouslyRaw,
}: {
  id?: string;
  data?: unknown;
  dangerouslyRaw?: string;
}) {
  // No headers() needed - relaxed CSP allows inline scripts for ISR/PPR compatibility
  const json =
    typeof dangerouslyRaw === "string"
      ? dangerouslyRaw
      : JSON.stringify(data ?? {});
  const __html = json.replace(/</g, "\\u003c");
  return (
    <script
      id={id}
      type="application/ld+json"
      suppressHydrationWarning={true}
      dangerouslySetInnerHTML={{ __html }}
    />
  );
}
