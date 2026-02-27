export default function EventCardSkeleton() {
  return (
    <div className="rounded-card overflow-hidden bg-background shadow-sm h-full flex flex-col">
      {/* Image placeholder — 2:1 aspect ratio */}
      <div className="aspect-[2/1] bg-border/40 animate-pulse" />

      {/* Content */}
      <div className="p-card-padding-sm flex-1 flex flex-col">
        <div className="w-3/4 h-5 bg-border/40 rounded animate-pulse mb-2" />
        <div className="w-1/2 h-5 bg-border/40 rounded animate-pulse mb-3" />
        <div className="mt-auto flex flex-col gap-1.5">
          <div className="w-2/3 h-3.5 bg-border/40 rounded animate-pulse" />
          <div className="w-1/2 h-3.5 bg-border/40 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
