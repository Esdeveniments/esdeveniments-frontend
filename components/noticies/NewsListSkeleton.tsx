import CardLoading from "@components/ui/cardLoading";

export default function NewsListSkeleton() {
  return (
    <section className="flex flex-col gap-6 px-2 lg:px-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="w-full">
          <CardLoading />
        </div>
      ))}
    </section>
  );
}
