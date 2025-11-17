import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";

const offlineDescription =
  "Pàgina en mode offline d'Esdeveniments.cat per continuar navegant mentre es recupera la connexió.";

const offlineBaseMeta = buildPageMeta({
  title: "Sense connexió - Esdeveniments.cat",
  description: offlineDescription,
  canonical: `${siteUrl}/offline`,
}) as Metadata;

export const metadata: Metadata = {
  ...offlineBaseMeta,
  robots: "noindex, nofollow",
};

const offlineSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${siteUrl}/offline#webpage`,
  url: `${siteUrl}/offline`,
  name: "Pàgina offline d'Esdeveniments.cat",
  description: offlineDescription,
  isPartOf: { "@id": `${siteUrl}#website` },
};

export default function OfflinePage() {
  return (
    <>
      <JsonLdServer id="offline-webpage-schema" data={offlineSchema} />
      <div
        className="min-h-screen flex items-center justify-center bg-muted"
        data-testid="offline-page"
      >
        <div className="text-center">
          <h1
            className="text-4xl font-bold text-foreground-strong mb-4"
            data-testid="offline-title"
          >
            🌐 Sense connexió
          </h1>
          <p className="text-lg text-foreground/80 mb-8">
            No pots connectar-te a internet. Alguns continguts emmagatzemats
            podrien estar disponibles.
          </p>
          <Link href="/" className="btn-primary" data-testid="offline-home-link">
            Torna a l&apos;inici
          </Link>
          <br />
          <Link href="/barcelona" className="btn-neutral mt-4 mr-2">
            Barcelona
          </Link>
          <Link href="/catalunya" className="btn-neutral mt-4">
            Catalunya
          </Link>
        </div>
      </div>
    </>
  );
}
