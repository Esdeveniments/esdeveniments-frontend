import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { siteUrl } from "@config/index";
import { SUPPORTED_LOCALES } from "types/i18n";

const rootLocaleMock = vi.fn<() => Promise<string>>();
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/root-params", () => ({
  locale: () => rootLocaleMock(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

import QuiSom, { generateMetadata } from "app/[locale]/qui-som/page";

describe("app/[locale]/qui-som/page", () => {
  beforeEach(() => {
    rootLocaleMock.mockReset();
    notFoundMock.mockClear();
    rootLocaleMock.mockResolvedValue("ca");
  });

  it("rejects unsupported locales via requireLocale", async () => {
    rootLocaleMock.mockResolvedValue("static");
    await expect(generateMetadata()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("localizes canonical metadata for non-default locales", async () => {
    rootLocaleMock.mockResolvedValue("es");
    const meta = await generateMetadata();
    expect(meta.alternates?.canonical).toBe(`${siteUrl}/es/qui-som`);
  });

  it("renders updated team, heading hierarchy, accessible LinkedIn links, and structured data", async () => {
    const jsx = await QuiSom();
    const { container } = render(jsx);

    // Heading outline: single h1, Contact & Team are h2, members are h3
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);

    // Current team only (Andreu removed) with distinct accessible link names
    expect(screen.getByText("Albert Olivé Corbella")).toBeInTheDocument();
    expect(screen.getByText("Gerard Rovellat Carbó")).toBeInTheDocument();
    expect(screen.queryByText(/Andreu/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Albert Olivé Corbella/i }),
    ).toHaveAttribute("href", "https://www.linkedin.com/in/albertolivecorbella/");
    expect(
      screen.getByRole("link", { name: /Gerard Rovellat Carbó/i }),
    ).toHaveAttribute("href", "https://www.linkedin.com/in/gerardrovellatcarbo/");

    // Single filled primary CTA (Contact); LinkedIn buttons use outline style
    expect(container.querySelectorAll(".btn-primary")).toHaveLength(1);
    expect(container.querySelectorAll(".btn-outline")).toHaveLength(2);

    // AboutPage JSON-LD links to #organization with logo, SUPPORTED_LOCALES, and 2 members
    const aboutScript = container.querySelector("#about-page-schema");
    expect(aboutScript).not.toBeNull();
    const aboutData = JSON.parse(aboutScript!.textContent || "{}");
    expect(aboutData.url).toBe(`${siteUrl}/qui-som`);
    expect(aboutData.mainEntity["@id"]).toBe(`${siteUrl}#organization`);
    expect(aboutData.mainEntity.logo?.url).toBe(
      `${siteUrl}/static/images/logo-seo-meta.webp`,
    );
    expect(aboutData.mainEntity.contactPoint[0].availableLanguage).toEqual([
      ...SUPPORTED_LOCALES,
    ]);
    expect(aboutData.mainEntity.member.map((m: { name: string }) => m.name)).toEqual([
      "Albert Olivé Corbella",
      "Gerard Rovellat Carbó",
    ]);

    // BreadcrumbList JSON-LD emitted
    const breadcrumbScript = container.querySelector("#about-breadcrumb-schema");
    expect(breadcrumbScript).not.toBeNull();
    const breadcrumbData = JSON.parse(breadcrumbScript!.textContent || "{}");
    expect(breadcrumbData["@type"]).toBe("BreadcrumbList");
    expect(breadcrumbData.itemListElement).toHaveLength(2);
    expect(breadcrumbData.itemListElement[1].item).toBe(`${siteUrl}/qui-som`);
  });

  it("localizes JSON-LD URLs for /en/qui-som", async () => {
    rootLocaleMock.mockResolvedValue("en");
    const jsx = await QuiSom();
    const { container } = render(jsx);

    const aboutData = JSON.parse(
      container.querySelector("#about-page-schema")?.textContent || "{}",
    );
    expect(aboutData.url).toBe(`${siteUrl}/en/qui-som`);
    const breadcrumbData = JSON.parse(
      container.querySelector("#about-breadcrumb-schema")?.textContent || "{}",
    );
    expect(breadcrumbData.itemListElement[0].item).toBe(`${siteUrl}/en`);
    expect(breadcrumbData.itemListElement[1].item).toBe(`${siteUrl}/en/qui-som`);
  });
});
