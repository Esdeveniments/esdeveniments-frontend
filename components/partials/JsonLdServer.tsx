import { headers } from "next/headers";

export default async function JsonLdServer({
  id,
  data,
  dangerouslyRaw,
}: {
  id?: string;
  data?: unknown;
  dangerouslyRaw?: string;
}) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";
  const json =
    typeof dangerouslyRaw === "string"
      ? dangerouslyRaw
      : JSON.stringify(data ?? {});
  const __html = json.replace(/</g, "\\u003c");
  return (
    <script
      id={id}
      type="application/ld+json"
      nonce={nonce}
      suppressHydrationWarning={true}
      dangerouslySetInnerHTML={{ __html }}
    />
  );
}
