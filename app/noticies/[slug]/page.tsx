import { notFound } from "next/navigation";
import { fetchNewsBySlug } from "@lib/api/news";

export default async function Page({ params }: { params: { slug: string } }) {
  const data = await fetchNewsBySlug(params.slug);
  if (!data) return notFound();

  return (
    <article className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-24 px-2 lg:px-0">
      <h1 className="uppercase mb-4">{data.title}</h1>
      <p className="mb-6 text-blackCorp font-barlow">{data.description}</p>
      {/* Simple list of referenced events */}
      <div className="mt-8">
        <h2 className="uppercase mb-2">Esdeveniments destacats</h2>
        <ul className="list-disc pl-6">
          {data.events.map((e) => (
            <li key={e.id} className="mb-2">
              <a href={`/e/${e.slug}`} className="text-primary underline">
                {e.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}