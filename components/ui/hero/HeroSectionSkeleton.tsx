export default function HeroSectionSkeleton() {
  return (
    <div
      className="w-full flex flex-col items-center gap-6 py-4 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="h-10 w-28 rounded-full bg-border/40" />
          <div className="h-10 w-36 rounded-full bg-border/40" />
        </div>
        <div className="h-4 w-64 rounded bg-border/40" />
      </div>

      <div className="w-full max-w-2xl mx-auto">
        <div className="h-12 w-full rounded-full border border-border bg-background">
          <div className="h-full w-full rounded-full bg-foreground/5" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-9 w-28 rounded-full bg-border/40" />
        ))}
      </div>

      <div className="h-11 w-64 rounded-full bg-border/40" />
      <div className="h-3 w-56 rounded bg-border/30" />
    </div>
  );
}
