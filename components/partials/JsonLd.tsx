"use client";

import Script from "next/script";

export default function JsonLd({
  id,
  data,
  dangerouslyRaw,
}: {
  id: string;
  data?: unknown;
  dangerouslyRaw?: string;
}) {
  const __html =
    typeof dangerouslyRaw === "string" ? dangerouslyRaw : JSON.stringify(data ?? {});
  return (
    <Script
      id={id}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html }}
    />
  );
}
