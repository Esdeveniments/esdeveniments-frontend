// Mirrors NewsArticleDetail: breadcrumbs, header, then the numbered event rows
// (CardLayout `row`: stacked on mobile, image 40% wide from md up).
function EventRowSkeleton() {
  return (
    <div className="rounded-card overflow-hidden bg-background border border-border/20 flex flex-col md:flex-row">
      <div className="aspect-[3/2] bg-border/40 animate-pulse md:w-2/5 md:shrink-0" />
      <div className="flex-1 flex flex-col gap-2 px-4 pt-3 pb-4 md:p-card-padding md:justify-center">
        <div className="w-16 h-4 bg-border/40 rounded-badge animate-pulse" />
        <div className="w-1/3 h-3.5 bg-border/40 rounded animate-pulse" />
        <div className="w-full h-6 bg-border/40 rounded animate-pulse" />
        <div className="w-full h-4 bg-border/40 rounded animate-pulse" />
        <div className="w-5/6 h-4 bg-border/40 rounded animate-pulse" />
        <div className="w-1/2 h-3.5 bg-border/40 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function NewsArticleSkeleton() {
  return (
    <div className="w-full bg-background pb-section-y" aria-hidden="true">
      <div className="container-article flex flex-col gap-section-y min-w-0">
        <div className="pt-4">
          <div className="h-4 w-64 bg-border/40 animate-pulse rounded" />
        </div>
        <div className="stack">
          <div className="h-5 w-24 bg-border/40 animate-pulse rounded-badge" />
          <div className="h-8 w-full bg-border/40 animate-pulse rounded" />
          <div className="h-8 w-2/3 bg-border/40 animate-pulse rounded" />
          <div className="h-4 w-1/2 bg-border/40 animate-pulse rounded" />
          <div className="h-5 w-full bg-border/40 animate-pulse rounded" />
          <div className="h-5 w-3/4 bg-border/40 animate-pulse rounded" />
        </div>
        <div className="stack">
          <div className="h-7 w-48 bg-border/40 animate-pulse rounded" />
          {["first", "second", "third"].map((key) => (
            <EventRowSkeleton key={key} />
          ))}
        </div>
      </div>
    </div>
  );
}
