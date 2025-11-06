"use client";

import Script from "next/script";
import { useNonce } from "./NonceProvider";

export default function JsonLd({
  id,
  data,
  dangerouslyRaw,
}: {
  id: string;
  data?: unknown;
  dangerouslyRaw?: string;
}) {
  const nonce = useNonce();
  const __html =
    typeof dangerouslyRaw === "string" ? dangerouslyRaw : JSON.stringify(data ?? {});
  return (
    <Script
      id={id}
      type="application/ld+json"
      strategy="afterInteractive"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html }}
    />
  );
}

