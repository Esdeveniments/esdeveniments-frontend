export default function NewsArticleSkeleton() {
  return (
    <div className="container flex-col justify-center items-center mt-8 pb-section-y-lg">
      {/* Breadcrumbs Skeleton */}
      <div className="mb-6 w-full px-2 lg:px-0">
        <div className="h-5 w-64 bg-muted animate-pulse rounded" />
      </div>

      {/* Main Content Skeleton */}
      <div className="w-full px-2 lg:px-0">
        <div className="mb-6">
          <div className="h-10 w-3/4 bg-muted animate-pulse rounded mb-6" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div className="h-8 w-48 bg-muted animate-pulse rounded-full" />
            <div className="h-6 w-32 bg-muted animate-pulse rounded mt-4 md:mt-0" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="my-8 h-64 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}
