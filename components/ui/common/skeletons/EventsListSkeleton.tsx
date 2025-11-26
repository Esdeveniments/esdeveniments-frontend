import EventCardSkeleton from "./EventCardSkeleton";

export default function EventsListSkeleton() {
  return (
    <div className="container flex-col justify-center items-center mt-element-gap">
      <section className="flex flex-col justify-center items-center">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-full mb-element-gap">
            <EventCardSkeleton />
          </div>
        ))}
      </section>
    </div>
  );
}
