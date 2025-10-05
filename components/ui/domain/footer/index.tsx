import { JSX } from "react";
import { Link as ActiveLink, Text } from "@components/ui/primitives";
import Social from "@components/ui/primitives/social";
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
    <footer className="flex w-full flex-col items-center gap-component-md border-t border-bColor bg-whiteCorp px-component-lg py-component-md md:px-component-md md:py-component-xl">
      <Social links={links} />
      <div className="flex flex-col items-center gap-component-xl">
        <div className="flex items-center justify-center gap-component-lg">
          {navigation.map((item) => (
            <ActiveLink href={item.href} key={item.name}>
              <Text size="xs" className="font-semibold">
                {item.name}
              </Text>
            </ActiveLink>
          ))}
        </div>
        <div className="flex w-full justify-center px-component-lg">
          <Text size="xs">© {new Date().getFullYear()} Esdeveniments.cat</Text>
        </div>
      </div>
    </footer>
  );
}
