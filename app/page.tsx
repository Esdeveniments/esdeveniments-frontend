import { getCategorizedEvents } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { generatePagesData } from "@components/partials/generatePagesData";
import { buildPageMeta } from "@components/partials/seo-meta";
import type { PageData } from "types/common";
import { CategorizedEvents } from "types/api/event";
import type { CategorySummaryResponseDTO } from "types/api/category";
import ServerEventsCategorized from "@components/ui/serverEventsCategorized";
import Search from "@components/ui/search";
import Link from "next/link";
import { Suspense, JSX } from "react";

const homeSeoLinkSections = [
  {
    title: "Què fer avui",
    links: [
      { href: "/barcelona/avui", label: "Què fer avui a Barcelona" },
      { href: "/maresme/avui", label: "Què fer avui al Maresme" },
      {
        href: "/valles-occidental/avui",
        label: "Què fer avui al Vallès Occidental",
      },
      {
        href: "/valles-oriental/avui",
        label: "Què fer avui al Vallès Oriental",
      },
    ],
  },
  {
    title: "Què fer demà",
    links: [
      { href: "/barcelona/dema", label: "Què fer demà a Barcelona" },
      { href: "/maresme/dema", label: "Què fer demà al Maresme" },
    ],
  },
  {
    title: "Agendes locals",
    links: [
      { href: "/maresme", label: "Agenda Maresme" },
      { href: "/barcelona", label: "Agenda Barcelona" },
      { href: "/vilassar-de-mar", label: "Agenda Vilassar de Mar" },
      { href: "/arenys-de-munt", label: "Agenda Arenys de Munt" },
      { href: "/canet-de-mar", label: "Agenda Canet de Mar" },
      { href: "/altafulla", label: "Agenda Altafulla" },
    ],
  },
] as const;

export async function generateMetadata() {
  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: "",
  });
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
  });
}

export default async function Page(): Promise<JSX.Element> {
  // Always fetch categorized events (no URL filters support)
  const categorizedEvents: CategorizedEvents = await getCategorizedEvents(5);

  // Fetch dynamic categories for enhanced category support
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    // Continue without categories - components will use static fallbacks
    console.error("Error fetching categories:", error);
    categories = [];
  }

  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: "",
  });

  return (
    <>
      <div className="container flex justify-center items-center">
        <Suspense
          fallback={
            <div className="w-full h-12 bg-background animate-pulse rounded-full" />
          }
        >
          <Search />
        </Suspense>
      </div>

      <ServerEventsCategorized
        categorizedEvents={categorizedEvents}
        pageData={pageData}
        categories={categories}
      />

      <nav
        aria-label="Destinacions destacades"
        className="sr-only"
        data-testid="home-top-city-links"
      >
        {homeSeoLinkSections.map((section) => (
          <div key={section.title}>
            <p className="font-semibold">{section.title}</p>
            <ul>
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
