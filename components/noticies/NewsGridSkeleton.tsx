import EventCardSkeleton from "@components/ui/common/skeletons/EventCardSkeleton";

export default function NewsGridSkeleton() {
  return (
    <div className="flex flex-col gap-10 px-2 lg:px-0">
      {[1, 2, 3, 4].map((i) => (
        <section key={i} className="w-full">
          <div className="w-48 h-6 bg-border/40 animate-pulse mb-1 rounded" />
          <EventCardSkeleton />
        </section>
      ))}
    </div>
  );
}
