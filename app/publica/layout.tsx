import { ReactNode } from "react";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";

export const metadata = buildPageMeta({
  title: "Publica - Esdeveniments.cat",
  description: "Publica un acte cultural - Esdeveniments.cat",
  canonical: `${siteUrl}/publica`,
});

const publishEventSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${siteUrl}/publica#webpage`,
  url: `${siteUrl}/publica`,
  name: "Publica un acte cultural",
  description:
    "Formulari oficial per afegir nous actes culturals a l'agenda col·laborativa d'Esdeveniments.cat.",
  inLanguage: "ca",
  isPartOf: { "@id": `${siteUrl}#website` },
  mainEntity: {
    "@type": "Organization",
    name: "Esdeveniments.cat",
    url: siteUrl,
  },
  potentialAction: {
    "@type": "CreateAction",
    target: `${siteUrl}/publica`,
    name: "Publicar esdeveniment cultural",
  },
};

export default function PublicaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLdServer id="publica-webpage-schema" data={publishEventSchema} />
      {children}
    </>
  );
}
