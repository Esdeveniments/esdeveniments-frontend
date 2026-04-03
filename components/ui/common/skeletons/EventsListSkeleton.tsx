import EventCardSkeleton from "./EventCardSkeleton";

export default function EventsListSkeleton() {
  return (
    <div className="container flex-col justify-center items-center mt-element-gap">
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <EventCardSkeleton />
          </div>
        ))}
      </section>
    </div>
  );
}
