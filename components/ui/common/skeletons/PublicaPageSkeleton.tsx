export default function PublicaPageSkeleton() {
  return (
    <div className="container flex flex-col justify-center pt-2 pb-14">
      <div className="flex flex-col gap-4 px-2 lg:px-0">
        {/* Header skeleton */}
        <div className="flex flex-col gap-2">
          <h1 className="italic uppercase font-semibold">
            <div className="h-8 bg-border/40 rounded w-64 animate-pulse" />
          </h1>
          <p className="text-sm text-center">
            <div className="h-4 bg-border/40 rounded w-32 mx-auto animate-pulse" />
          </p>
        </div>

        {/* Form skeleton */}
        <div className="w-full flex flex-col gap-y-4 pt-4">
          {/* Title input */}
          <div className="w-full h-12 bg-border/40 rounded-input animate-pulse" />

          {/* Description textarea */}
          <div className="w-full h-32 bg-border/40 rounded-input animate-pulse" />

          {/* Date inputs row */}
          <div className="w-full flex gap-element-gap">
            <div className="flex-1 h-12 bg-border/40 rounded-input animate-pulse" />
            <div className="flex-1 h-12 bg-border/40 rounded-input animate-pulse" />
          </div>

          {/* Location select */}
          <div className="w-full h-12 bg-border/40 rounded-input animate-pulse" />

          {/* Categories grid - reduced to 3 for faster FCP */}
          <div className="w-full grid grid-cols-3 gap-element-gap">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-border/40 rounded animate-pulse"
              />
            ))}
          </div>

          {/* Image upload */}
          <div className="w-full h-48 bg-border/40 rounded animate-pulse" />

          {/* Submit button */}
          <div className="w-full h-12 bg-border/40 rounded-button animate-pulse" />
        </div>
      </div>
    </div>
  );
}

