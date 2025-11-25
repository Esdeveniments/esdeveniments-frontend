import { JSX } from "react";
import ActiveLink from "@components/ui/common/link";
import Social from "@components/ui/common/social";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { TOP_AGENDA_LINKS } from "@config/top-agenda-links";
import { NavigationItem, SocialLinks } from "types/common";

const navigation: NavigationItem[] = [
  { name: "Inici", href: "/", current: false },
  { name: "Agenda", href: "/catalunya", current: false },
  { name: "Publicar", href: "/publica", current: false },
  { name: "Notícies", href: "/noticies", current: false },
  { name: "Qui som", href: "/qui-som", current: false },
  { name: "Arxiu", href: "/sitemap", current: false },
];

export default function Footer(): JSX.Element {
  const links: SocialLinks = {
    web: "https://www.esdeveniments.cat",
    twitter: "https://twitter.com/esdeveniments_",
    instagram: "https://www.instagram.com/esdevenimentscat/",
    telegram: "https://t.me/esdeveniments",
    facebook: "https://www.facebook.com/esdeveniments.cat/",
  };

  return (
    <footer className="w-full border-t border-border bg-gradient-to-b from-background to-muted/30">
      <div className="container flex flex-col items-center gap-section-y-sm pt-section-y pb-20 md:pb-section-y px-section-x">
        {/* Social Media Section */}
        <div className="flex flex-col items-center gap-element-gap">
          <Social links={links} />
        </div>

        {/* Horizontal Divider */}
        <hr className="w-full max-w-4xl border-t border-border/50" />

        {/* Navigation Links Section */}
        <nav
          className="flex flex-wrap justify-center items-center gap-4 w-full max-w-full"
          aria-label="Footer navigation"
        >
          {navigation.map((item) => (
            <ActiveLink
              href={item.href}
              key={item.name}
              className="label font-semibold px-button-x py-button-y whitespace-nowrap hover:text-primary transition-interactive"
            >
              {item.name}
            </ActiveLink>
          ))}
        </nav>

        {/* Horizontal Divider */}
        <hr className="w-full max-w-4xl border-t border-border/50" />

        {/* Featured Agendas Section */}
        <section
          className="w-full flex flex-col items-center gap-element-gap"
          aria-labelledby="featured-agendas"
        >
          <h2 id="featured-agendas" className="heading-4 text-foreground-strong">
            Agendes destacades
          </h2>
          <div className="w-full max-w-5xl bg-background/50 rounded-card p-6 shadow-sm border border-border/40">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3">
              {TOP_AGENDA_LINKS.map((item) => (
                <PressableAnchor
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className="body-small text-foreground/80 hover:text-primary hover:underline decoration-2 underline-offset-4 transition-all duration-normal py-1"
                  variant="inline"
                >
                  {item.label}
                </PressableAnchor>
              ))}
            </div>
          </div>
        </section>

        {/* Horizontal Divider */}
        <hr className="w-full max-w-4xl border-t border-border/50" />

        {/* Copyright Section */}
        <div className="w-full flex flex-col items-center gap-element-gap-sm px-section-x">
          <span className="body-small text-foreground/70 text-center">
            © {new Date().getFullYear()} Esdeveniments.cat
          </span>
          <span className="text-xs text-foreground/50 text-center">
            Descobreix els millors esdeveniments a Catalunya
          </span>
        </div>
      </div>
    </footer>
  );
}
