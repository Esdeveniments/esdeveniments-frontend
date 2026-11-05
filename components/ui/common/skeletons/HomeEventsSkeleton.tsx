export default function HomeEventsSkeleton() {
  return (
    <div
      className="container py-section-y animate-pulse"
      aria-hidden="true"
      data-testid="home-events-skeleton"
    >
      <div className="space-y-6">
        <div className="h-7 w-56 rounded bg-foreground/10" />
        <div className="h-5 w-2/3 rounded bg-foreground/10" />
        <div className="grid gap-element-gap md:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="space-y-4 rounded-lg border p-6">
              <div className="h-6 w-40 rounded bg-foreground/10" />
              <div className="h-4 w-full rounded bg-foreground/10" />
              <div className="h-4 w-3/4 rounded bg-foreground/10" />
              <div className="h-32 rounded bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
