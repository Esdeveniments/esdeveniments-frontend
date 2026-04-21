// Root-level Suspense boundary for the [locale] segment. Needed because
// static-ish pages (qui-som, patrocina, legal, etc.) await getLocaleSafely()
// which reads headers() — with cacheComponents enabled, those awaits must
// resolve inside a Suspense boundary or prerender fails. Refactored dynamic
// routes (homepage, listings, event, news) still flush their own shell and
// stream through their own inner Suspense boundaries; this outer fallback
// only fires for segments that don't have their own loading.tsx or inner
// Suspense.
export default function Loading() {
  return (
    <div
      aria-hidden="true"
      className="w-full min-h-[40vh] bg-background"
    />
  );
}
