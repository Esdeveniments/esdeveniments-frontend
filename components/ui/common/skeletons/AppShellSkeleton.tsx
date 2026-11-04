/**
 * Minimal app-shell fallback shown while next-intl messages load.
 *
 * We intentionally keep this neutral: no page-specific shapes, just the
 * header and a blank main area. Page-level Suspense fallbacks (e.g. on
 * /publica) will take over once the layout renders, so a generic skeleton
 * here avoids a jarring double-skeleton effect.
 */
export default function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background" aria-hidden="true">
      {/* Header placeholder */}
      <header className="md:sticky md:top-0 z-50 h-14 w-full border-b border-border/40 bg-background/95 shadow-sm">
        <div className="container flex h-full items-center">
          <div className="h-8 w-32 animate-pulse rounded bg-border/40" />
        </div>
      </header>

      {/* Blank main area — page-level fallbacks render here next */}
      <main className="w-full flex-1 bg-background" />
    </div>
  );
}
