export default function EventCardSkeleton() {
  return (
    <div className="rounded-card overflow-hidden bg-background shadow-sm h-full flex flex-col">
      <div className="aspect-[3/2] bg-border/40 animate-pulse" />
      <div className="px-3 pt-3 pb-3 flex-1 flex flex-col">
        <div className="w-2/3 h-3.5 bg-border/40 rounded animate-pulse mb-1.5" />
        <div className="w-full h-4 bg-border/40 rounded animate-pulse mb-1" />
        <div className="w-3/4 h-4 bg-border/40 rounded animate-pulse mb-2" />
        <div className="mt-auto w-1/2 h-3 bg-border/40 rounded animate-pulse" />
      </div>
    </div>
  );
}
