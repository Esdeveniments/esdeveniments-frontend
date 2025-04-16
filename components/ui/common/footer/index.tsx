import { JSX } from "react";
import ActiveLink from "@components/ui/common/link";
import Social from "@components/ui/common/social";

interface NavigationItem {
  name: string;
  href: string;
  current: boolean;
}

interface SocialLinks {
  web: string;
  twitter: string;
  instagram: string;
  telegram: string;
  facebook: string;
  [key: string]: string;
}

const navigation: NavigationItem[] = [
  { name: "Agenda", href: "/", current: false },
  { name: "Publicar", href: "/publica", current: false },
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
    <footer className="w-full flex flex-col items-center gap-4 border-t border-bColor bg-whiteCorp py-4 px-6 md:py-8 md:px-4">
      <Social links={links} />
      <div className="flex flex-col items-center gap-8 text-xs">
        <div className="flex justify-center items-center gap-6">
          {navigation.map((item) => (
            <ActiveLink href={item.href} key={item.name}>
              <a className="font-semibold">{item.name}</a>
            </ActiveLink>
          ))}
        </div>
        <div className="w-full flex justify-center px-6">
          © {new Date().getFullYear()} Esdeveniments.cat
        </div>
      </div>
    </footer>
  );
}
