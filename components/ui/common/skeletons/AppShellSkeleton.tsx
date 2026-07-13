export default function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background" aria-hidden="true">
      {/* Header placeholder */}
      <header className="md:sticky md:top-0 z-50 h-14 w-full border-b border-border/40 bg-background/95 shadow-sm">
        <div className="container flex h-full items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-border/40" />
          <div className="flex items-center gap-2">
            <div className="hidden h-8 w-24 animate-pulse rounded-full bg-border/40 sm:block" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-border/40" />
          </div>
        </div>
      </header>

      {/* Main content placeholder */}
      <main className="w-full min-h-screen bg-background">
        <div className="container py-section-y">
          <div className="mb-element-gap h-10 w-2/3 max-w-md animate-pulse rounded bg-border/40" />
          <div className="mb-element-gap h-5 w-1/2 max-w-sm animate-pulse rounded bg-border/40" />
          <div className="space-y-element-gap">
            <div className="h-64 w-full animate-pulse rounded-card bg-border/40" />
            <div className="h-64 w-full animate-pulse rounded-card bg-border/40" />
          </div>
        </div>
      </main>

      {/* Mobile bottom nav placeholder */}
      <div className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border/40 bg-background/95 backdrop-blur-md md:hidden" />
    </div>
  );
}
