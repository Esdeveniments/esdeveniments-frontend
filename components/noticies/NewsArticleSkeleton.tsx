export default function NewsArticleSkeleton() {
  return (
    <div className="min-h-screen bg-background mt-4">
      {/* Breadcrumbs Skeleton */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-5 w-64 bg-gray-200 animate-pulse rounded" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <div className="h-10 w-3/4 bg-gray-200 animate-pulse rounded mb-6" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded-full" />
            <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mt-4 md:mt-0" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>

        <div className="my-8 h-64 bg-gray-200 animate-pulse rounded" />
      </div>
    </div>
  );
}
