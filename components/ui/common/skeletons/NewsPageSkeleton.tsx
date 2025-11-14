export default function NewsPageSkeleton() {
  return (
    <div className="container flex-col justify-center items-center mt-8">
      {/* Header skeleton */}
      <h1 className="uppercase mb-2 px-2 lg:px-0">
        <div className="h-8 bg-border/40 rounded w-32 animate-pulse" />
      </h1>
      <p className="text-[16px] font-normal text-foreground-strong text-left mb-8 px-2 font-barlow">
        <div className="h-4 bg-border/40 rounded w-2/3 animate-pulse" />
      </p>

      {/* RSS link skeleton */}
      <div className="w-full flex justify-end px-2 lg:px-0 mb-4 text-sm">
        <div className="h-4 bg-border/40 rounded w-12 animate-pulse" />
      </div>

      {/* Breadcrumb skeleton */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 px-2 lg:px-0 text-sm text-foreground-strong/70"
      >
        <div className="h-4 bg-border/40 rounded w-48 animate-pulse" />
      </nav>

      {/* News cards skeleton - reduced to 2 for faster FCP */}
      <div className="flex flex-col gap-10 px-2 lg:px-0">
        {Array.from({ length: 2 }).map((_, i) => (
          <section key={i} className="w-full">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="uppercase">
                <div className="h-6 bg-border/40 rounded w-48 animate-pulse" />
              </h2>
              <div className="h-4 bg-border/40 rounded w-24 animate-pulse text-sm" />
            </div>
            <div className="w-full h-64 bg-border/40 rounded animate-pulse mt-4" />
          </section>
        ))}
      </div>
    </div>
  );
}

