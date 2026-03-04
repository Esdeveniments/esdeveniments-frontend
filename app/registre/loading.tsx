export default function RegisterLoading() {
  return (
    <div
      className="container flex justify-center items-center pt-[6rem]"
      data-testid="register-page-skeleton"
    >
      <div className="card-bordered rounded-lg overflow-hidden w-full max-w-md p-section-x py-element-gap">
        {/* Title skeleton */}
        <div className="h-8 bg-border/40 rounded w-2/3 animate-pulse mb-element-gap" />

        {/* Name field */}
        <div className="mb-element-gap">
          <div className="h-4 bg-border/40 rounded w-1/4 animate-pulse mb-2" />
          <div className="h-10 bg-border/40 rounded w-full animate-pulse" />
        </div>

        {/* Email field */}
        <div className="mb-element-gap">
          <div className="h-4 bg-border/40 rounded w-1/4 animate-pulse mb-2" />
          <div className="h-10 bg-border/40 rounded w-full animate-pulse" />
        </div>

        {/* Password field */}
        <div className="mb-element-gap">
          <div className="h-4 bg-border/40 rounded w-1/3 animate-pulse mb-2" />
          <div className="h-10 bg-border/40 rounded w-full animate-pulse" />
        </div>

        {/* Submit button */}
        <div className="h-10 bg-border/40 rounded w-full animate-pulse mt-element-gap" />
      </div>
    </div>
  );
}
