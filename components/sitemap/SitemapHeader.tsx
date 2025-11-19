
import type { SitemapHeaderProps } from "types/sitemap";

export default async function SitemapHeader({
  town,
  placePromise,
}: SitemapHeaderProps) {
  const place = await placePromise;
  const label = place?.name || town;

  return (
    <header>
      <h1 className="heading-1 mb-4">Arxiu històric de {label}</h1>
      <p className="body-large text-foreground">
        Descobreix l&apos;evolució cultural de {label} any rere any. Cada enllaç
        et porta als esdeveniments d&apos;un mes específic.
      </p>
    </header>
  );
}
