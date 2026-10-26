export default function AuthCheckSkeleton() {
  return (
    <div
      className="container flex-center pt-[6rem] pb-section-y"
      aria-hidden="true"
    >
      <div className="w-full max-w-md card-bordered card-body stack text-center">
        <div className="flex-center">
          <div className="w-14 h-14 rounded-full bg-border/40 animate-pulse" />
        </div>
        <div className="h-6 bg-border/40 rounded w-2/3 mx-auto animate-pulse" />
        <div className="h-4 bg-border/40 rounded w-full animate-pulse" />
        <div className="h-10 bg-border/40 rounded w-full animate-pulse" />
      </div>
    </div>
  );
}
