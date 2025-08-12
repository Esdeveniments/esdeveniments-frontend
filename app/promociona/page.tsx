import Link from "next/link";
import {
  PROMOTE_DURATIONS,
  PROMOTE_PRICING,
  PROMOTE_VISIBILITY,
  PROMOTE_KINDS,
  PROMOTE_PLACEMENTS,
  PROMOTE_PLACEMENT_MULTIPLIER,
} from "@utils/constants";
import type { Metadata } from "next";
import ClientBusinessUpload from "./upload-client";

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
  const rawKind = typeof params.kind === "string" ? params.kind : undefined;
  const rawPlacement = typeof params.placement === "string" ? params.placement : undefined;
  const eventId = typeof params.eventId === "string" ? params.eventId : undefined;

  const scope = getSelected(rawScope, "ciutat", PROMOTE_VISIBILITY as unknown as string[]);
  const days = getSelected(rawDays, 7, PROMOTE_DURATIONS as unknown as number[]);
  const kind = getSelected(rawKind, "event", PROMOTE_KINDS as unknown as string[]);
  const placement = getSelected(
    rawPlacement,
    "global",
    PROMOTE_PLACEMENTS as unknown as string[]
  );

  const basePrice = PROMOTE_PRICING[scope]?.[days] ?? 0;
  const multiplier = PROMOTE_PLACEMENT_MULTIPLIER[placement] ?? 1;
  const price = Math.max(0, basePrice * multiplier);

  const buildUrl = (next: Partial<Record<string, string | number>>) => {
    const sp = new URLSearchParams();
    sp.set("scope", (next.scope as string) || scope);
    sp.set("days", String((next.days as number) || days));
    sp.set("kind", (next.kind as string) || kind);
    sp.set("placement", (next.placement as string) || placement);
    if (eventId) sp.set("eventId", eventId);
    return `/promociona?${sp.toString()}`;
  };

  const toPublicaUrl = () => {
    const sp = new URLSearchParams();
    sp.set("promote", "1");
    sp.set("scope", scope);
    sp.set("days", String(days));
    sp.set("kind", kind);
    sp.set("placement", placement);
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

      <h1 className="uppercase mb-4">Promociona</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="bg-whiteCorp border border-darkCorp/10 rounded-lg p-4">
          <h2 className="text-base font-semibold uppercase tracking-wide mb-3">
            Tipus
          </h2>
          <div className="flex flex-wrap gap-2">
            {PROMOTE_KINDS.map((k) => (
              <Link
                key={k as string}
                href={buildUrl({ kind: k as string })}
                className={`px-4 py-2 rounded-full border ${
                  kind === k ? "bg-primary text-white border-primary" : "bg-whiteCorp border-darkCorp/20"
                }`}
                prefetch={false}
              >
                {k === "event" ? "Esdeveniment" : "Negoci"}
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-whiteCorp border border-darkCorp/10 rounded-lg p-4">
          <h2 className="text-base font-semibold uppercase tracking-wide mb-3">
            Àrea de visibilitat
          </h2>
          <div className="flex flex-wrap gap-2">
            {PROMOTE_VISIBILITY.map((opt) => (
              <Link
                key={opt}
                href={buildUrl({ scope: opt as string })}
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
                href={buildUrl({ days: d })}
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

        <section className="bg-whiteCorp border border-darkCorp/10 rounded-lg p-4">
          <h2 className="text-base font-semibold uppercase tracking-wide mb-3">
            Ubicació de la impressió
          </h2>
          <div className="flex flex-wrap gap-2">
            {PROMOTE_PLACEMENTS.map((p) => (
              <Link
                key={p as string}
                href={buildUrl({ placement: p as string })}
                className={`px-4 py-2 rounded-full border ${
                  placement === p
                    ? "bg-primary text-white border-primary"
                    : "bg-whiteCorp border-darkCorp/20"
                }`}
                prefetch={false}
              >
                {p === "global" ? "Global (home + llistes)" : p === "category" ? "Només categoria" : "Newsletter"}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {kind === "business" && (
        <section className="mt-6 bg-whiteCorp border border-darkCorp/10 rounded-lg p-4">
          <h2 className="text-base font-semibold uppercase tracking-wide mb-3">
            Creativitats (MVP)
          </h2>
          <ClientBusinessUpload />
        </section>
      )}

      <section className="mt-6 bg-whiteCorp border border-darkCorp/10 rounded-lg p-4">
        <h2 className="text-base font-semibold uppercase tracking-wide mb-3">
          Resum
        </h2>
        <ul className="list-disc ml-5 text-sm text-blackCorp/80 space-y-1">
          <li>Tipus: {kind === "event" ? "Esdeveniment" : "Negoci"}</li>
          <li>Àrea: {scope === "zona" ? "Zona" : scope === "ciutat" ? "Ciutat" : "País"}</li>
          <li>Durada: {days} dies</li>
          <li>Ubicació: {placement === "global" ? "Global (home + llistes)" : placement === "category" ? "Només categoria" : "Newsletter"}</li>
          <li>On es mostra: pàgina principal, llistes i pàgines de lloc segons l&apos;àrea</li>
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