"use client";

import Script from "next/script";
import DOMPurify from "isomorphic-dompurify";
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
  const raw = typeof dangerouslyRaw === "string" ? dangerouslyRaw : JSON.stringify(data ?? {});
  // Sanitize the JSON-LD content to prevent XSS when dangerouslyRaw can come from untrusted sources.
  // DOMPurify will leave valid JSON-LD intact while removing any script or malicious HTML.
  const __html = DOMPurify.sanitize(raw, { USE_PROFILES: { json: true } });
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

