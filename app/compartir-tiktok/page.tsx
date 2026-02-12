import type { Metadata } from "next";
import ShareTikTok from "@components/ui/tiktok/ShareTikTok";

export const metadata: Metadata = {
  title: "Compartir a TikTok",
  robots: { index: false, follow: false },
};

/**
 * Hidden tool page for sharing videos to TikTok.
 * Satisfies TikTok's Direct Post audit UX requirements.
 * Not indexed by crawlers (noindex via metadata + proxy.ts header).
 */
export default function ShareTikTokPage() {
  return (
    <main
      className="py-section-y px-section-x"
      style={{ maxWidth: 640, margin: "0 auto" }}
    >
      <ShareTikTok />
    </main>
  );
}
