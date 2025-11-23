import { JSX } from "react";
import ActiveLink from "@components/ui/common/link";
import Social from "@components/ui/common/social";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { NavigationItem, SocialLinks } from "types/common";

const navigation: NavigationItem[] = [
  { name: "Inici", href: "/", current: false },
  { name: "Agenda", href: "/catalunya", current: false },
  { name: "Publicar", href: "/publica", current: false },
  { name: "Notícies", href: "/noticies", current: false },
  { name: "Qui som", href: "/qui-som", current: false },
  { name: "Arxiu", href: "/sitemap", current: false },
];

const topAgendaLinks: NavigationItem[] = [
  { name: "Agenda Cardedeu", href: "/cardedeu", current: false },
  { name: "Agenda Llinars", href: "/llinars", current: false },
  { name: "Agenda La Garriga", href: "/la-garriga", current: false },
  { name: "Agenda El Masnou", href: "/el-masnou", current: false },
  { name: "Agenda Granollers", href: "/granollers", current: false },
  { name: "Agenda Canet de Mar", href: "/canet-de-mar", current: false },
  { name: "Agenda Castellbisbal", href: "/castellbisbal", current: false },
  { name: "Agenda Lliçà de Vall", href: "/llica-de-vall", current: false },
  { name: "Agenda Arenys de Munt", href: "/arenys-de-munt", current: false },
  { name: "Agenda Calella", href: "/calella", current: false },
  { name: "Agenda Mataró", href: "/mataro", current: false },
  { name: "Agenda Malgrat de Mar", href: "/malgrat-de-mar", current: false },
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
    <footer className="w-full border-t border-border bg-background">
      <div className="container flex flex-col items-center gap-element-gap pt-section-y pb-14 md:pb-section-y px-section-x">
        <Social links={links} />
        <nav className="flex flex-wrap justify-center items-center gap-element-gap w-full max-w-full">
          {navigation.map((item) => (
            <ActiveLink
              href={item.href}
              key={item.name}
              className="label font-medium px-button-x py-button-y whitespace-nowrap"
            >
              {item.name}
            </ActiveLink>
          ))}
        </nav>
        <section className="w-full flex flex-col items-center gap-element-gap-sm">
          <h2 className="label text-foreground/70">Agendes destacades</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-4xl">
            {topAgendaLinks.map((item) => (
              <PressableAnchor
                key={item.href}
                href={item.href}
                prefetch={false}
                className="body-small text-foreground/80 hover:text-primary hover:underline transition-interactive whitespace-nowrap"
                variant="inline"
              >
                {item.name}
              </PressableAnchor>
            ))}
          </div>
        </section>
        <div className="w-full flex justify-center px-section-x">
          <span className="label text-center">
            © {new Date().getFullYear()} Esdeveniments.cat
          </span>
        </div>
      </div>
    </footer>
  );
}
