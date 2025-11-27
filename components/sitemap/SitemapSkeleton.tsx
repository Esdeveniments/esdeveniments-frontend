export default function SitemapSkeleton() {
  return (
    <section className="stack gap-8">
      <header>
        <div className="h-10 w-64 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-6 w-full bg-gray-200 animate-pulse rounded" />
      </header>

      <div className="stack gap-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-6 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      </div>

      <div className="stack gap-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-6 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      </div>
    </section>
  );
}
