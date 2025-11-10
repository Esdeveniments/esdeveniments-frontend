export default function ShareIslandSkeleton({
  count = 4,
  className = "w-[172px] h-8 flex items-center gap-4",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-border dark:bg-foreground-strong/30 animate-fast-pulse"
        />
      ))}
    </div>
  );
}
