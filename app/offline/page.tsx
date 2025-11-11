import Link from "next/link";

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-muted"
      data-testid="offline-page"
    >
      {/* Minimal stylesheet to ensure basic styling when offline CSS chunks are unavailable */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/static/css/offline.css" />
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
  );
}
