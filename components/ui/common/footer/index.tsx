import { JSX } from "react";
import ActiveLink from "@components/ui/common/link";
import Social from "@components/ui/common/social";
import { NavigationItem, SocialLinks } from "types/common";

const navigation: NavigationItem[] = [
  { name: "Agenda", href: "/", current: false },
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
    <footer className="w-full border-t border-border bg-background">
      <div className="container flex flex-col items-center gap-element-gap py-section-y">
        <Social links={links} />
        <nav className="flex justify-center items-center gap-element-gap">
          {navigation.map((item) => (
            <ActiveLink
              href={item.href}
              key={item.name}
              className="label font-medium px-button-x py-button-y"
            >
              {item.name}
            </ActiveLink>
          ))}
        </nav>
        <div className="w-full flex justify-center">
          <span className="label">© {new Date().getFullYear()} Esdeveniments.cat</span>
        </div>
      </div>
    </footer>
  );
}
