/**
 * OAuth callback page — displays the authorization code from the URL.
 * In popup flow: posts the code to the opener window and closes.
 * In standalone flow: shows the code for manual copy.
 * Hidden from crawlers via noindex metadata.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import CallbackContent from "./CallbackContent";

export const metadata: Metadata = {
  title: "OAuth Callback",
  robots: { index: false, follow: false },
};

export default function CallbackPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem" }}>Loading...</p>}>
      <CallbackContent />
    </Suspense>
  );
}
