import Link from "next/link";
import { headers } from "next/headers";
import { PROMOTE_DURATIONS, PROMOTE_PRICING, PROMOTE_VISIBILITY } from "@utils/constants";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Promociona el teu esdeveniment | Esdeveniments.cat",
    description:
      "Tria l'àrea de visibilitat i la durada per destacar el teu esdeveniment. MVP sense pagament: redirigim a publica.",
  } as Metadata;
}

function getSelected<T>(value: T | undefined, fallback: T, allowed: readonly T[]): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = (await searchParams) || {};

  const rawScope = typeof params.scope === "string" ? params.scope : undefined;
  const rawDays = typeof params.days === "string" ? parseInt(params.days, 10) : undefined;
  const eventId = typeof params.eventId === "string" ? params.eventId : undefined;

  const scope = getSelected(rawScope, "ciutat", PROMOTE_VISIBILITY as unknown as string[]);
  const days = getSelected(rawDays, 7, PROMOTE_DURATIONS as unknown as number[]);
  const price = PROMOTE_PRICING[scope]?.[days] ?? 0;

  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  const buildUrl = (nextScope: string, nextDays: number) => {
    const sp = new URLSearchParams();
    sp.set("scope", nextScope);
    sp.set("days", String(nextDays));
    if (eventId) sp.set("eventId", eventId);
    return `/promociona?${sp.toString()}`;
  };

  const toPublicaUrl = () => {
    const sp = new URLSearchParams();
    sp.set("promote", "1");
    sp.set("scope", scope);
    sp.set("days", String(days));
    if (eventId) sp.set("eventId", eventId);
    return `/publica?${sp.toString()}`;
  };

  return (
    <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-28 px-2 lg:px-0">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-blackCorp/70">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="hover:underline">
              Inici
            </Link>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li className="text-blackCorp">Promociona</li>
        </ol>
      </nav>

      <h1 className="uppercase mb-4">Promociona el teu esdeveniment</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="bg-whiteCorp border border-darkCorp/10 rounded-lg p-4">
          <h2 className="text-base font-semibold uppercase tracking-wide mb-3">
            Àrea de visibilitat
          </h2>
          <div className="flex flex-wrap gap-2">
            {PROMOTE_VISIBILITY.map((opt) => (
              <Link
                key={opt}
                href={buildUrl(opt as string, days)}
                className={`px-4 py-2 rounded-full border ${
                  scope === opt ? "bg-primary text-white border-primary" : "bg-whiteCorp border-darkCorp/20"
                }`}
                prefetch={false}
              >
                {opt === "zona" ? "Zona" : opt === "ciutat" ? "Ciutat" : "País"}
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-whiteCorp border border-darkCorp/10 rounded-lg p-4">
          <h2 className="text-base font-semibold uppercase tracking-wide mb-3">
            Durada
          </h2>
          <div className="flex flex-wrap gap-2">
            {PROMOTE_DURATIONS.map((d) => (
              <Link
                key={d}
                href={buildUrl(scope, d)}
                className={`px-4 py-2 rounded-full border ${
                  days === d ? "bg-primary text-white border-primary" : "bg-whiteCorp border-darkCorp/20"
                }`}
                prefetch={false}
              >
                {d} dies
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 bg-whiteCorp border border-darkCorp/10 rounded-lg p-4">
        <h2 className="text-base font-semibold uppercase tracking-wide mb-3">
          Resum
        </h2>
        <ul className="list-disc ml-5 text-sm text-blackCorp/80 space-y-1">
          <li>Àrea seleccionada: {scope === "zona" ? "Zona" : scope === "ciutat" ? "Ciutat" : "País"}</li>
          <li>Durada: {days} dies</li>
          <li>On es mostra: pàgina principal, llistes i pàgines de lloc segons l'àrea</li>
        </ul>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-2xl font-semibold">{price.toFixed(2)} €</span>
          <Link
            href={toPublicaUrl()}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primarydark"
            prefetch={false}
          >
            Continuar
          </Link>
        </div>
      </section>
    </div>
  );
}