"use client";

import { usePathname } from "next/navigation";
import { Disclosure } from "@headlessui/react";
import {
  MenuIcon,
  XIcon,
  PlusIcon as PlusSmIcon,
  HomeIcon,
  NewspaperIcon,
} from "@heroicons/react/outline";
import Image from "next/image";
import ActiveLink from "@components/ui/common/link";
import logo from "@public/static/images/logo-esdeveniments.webp";
import PressableLink from "@components/ui/primitives/PressableLink";
import { NavigationItem } from "types/common";

const navigation: NavigationItem[] = [
  { name: "Inici", href: "/", current: true },
  { name: "Agenda", href: "/catalunya", current: false },
  { name: "Publicar", href: "/publica", current: false },
  { name: "Notícies", href: "/noticies", current: false },
  { name: "Arxiu", href: "/sitemap", current: false },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <Disclosure
      key={pathname}
      as="nav"
      id="site-navbar"
      className="w-full bg-background md:sticky md:top-0 z-50 border-b border-border/50 md:shadow-sm md:backdrop-blur-sm"
    >
      {({ open }) => (
        <>
          <div className="container bg-background py-2 h-14">
            <div className="h-full flex flex-col justify-center">
              {/* FirstBar - Logo&LaptopMenu&MenuIcon */}
              <div className="flex justify-between items-center">
                {/* Logo */}
                <div className="flex flex-1 md:w-1/2 justify-start items-center py-2 px-3">
                  <PressableLink
                    href="/"
                    prefetch={false}
                    variant="inline"
                    className="transition-transform duration-normal hover:scale-105"
                  >
                    <Image
                      src={logo}
                      className="bg-background flex justify-center items-center cursor-pointer"
                      alt="Logo Esdeveniments.cat"
                      width={190}
                      height={18}
                      priority={true}
                    />
                  </PressableLink>
                </div>
                {/* MenuIcon */}
                <div className="flex justify-center items-center md:hidden">
                  <Disclosure.Button
                    className="inline-flex items-center justify-center py-2 px-3 rounded-button hover:bg-muted transition-interactive focus:outline-none"
                    aria-label={open ? "Close menu" : "Open menu"}
                  >
                    {open ? (
                      <XIcon className="h-5 w-5" />
                    ) : (
                      <MenuIcon className="h-5 w-5" />
                    )}
                  </Disclosure.Button>
                </div>
                {/* LaptopMenu */}
                <div className="hidden md:flex md:w-1/2 justify-end items-center">
                  <div className="flex-center gap-1">
                    {navigation.map((item) => (
                      <ActiveLink
                        href={item.href}
                        key={item.name}
                        className="label font-semibold px-button-x py-button-y border-b-2 border-b-background hover:bg-muted/50 rounded-t-lg transition-all"
                      >
                        {item.name}
                      </ActiveLink>
                    ))}
                  </div>
                </div>
              </div>
              {/* SecondBar - Mobile Bottom Navigation */}
              <div className="fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background/95 backdrop-blur-md flex justify-evenly items-center gap-2 md:hidden px-section-x z-50 shadow-lg">
                {/* Home */}
                <div className="flex-center">
                  <ActiveLink
                    href="/"
                    activeLinkClass="text-primary bg-primary/10"
                  >
                    <button
                      type="button"
                      className="flex-center p-3 rounded-full hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[44px] min-h-[44px]"
                      aria-label="Home"
                    >
                      <HomeIcon className="h-6 w-6" />
                    </button>
                  </ActiveLink>
                </div>

                {/* Publicar */}
                <div className="flex-center">
                  <ActiveLink
                    href="/publica"
                    activeLinkClass="text-primary bg-primary/10"
                  >
                    <button
                      type="button"
                      className="flex-center gap-2 px-4 py-3 rounded-full hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]"
                      aria-label="Publish"
                    >
                      <PlusSmIcon className="h-6 w-6" />
                      <span className="hidden sm:block label font-semibold">Publica</span>
                    </button>
                  </ActiveLink>
                </div>

                {/* Notícies */}
                <div className="flex-center">
                  <ActiveLink
                    href="/noticies"
                    activeLinkClass="text-primary bg-primary/10"
                  >
                    <button
                      type="button"
                      className="flex-center p-3 rounded-full hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[44px] min-h-[44px]"
                      aria-label="Notícies"
                    >
                      <NewspaperIcon className="h-6 w-6" />
                    </button>
                  </ActiveLink>
                </div>
              </div>
            </div>
          </div>
          {/* MenuPanel (md:hidden) */}
          <Disclosure.Panel className="md:hidden relative z-50 bg-background border-b border-border shadow-md">
            <div className="w-full flex flex-col items-stretch bg-background py-3 px-section-x gap-2">
              {navigation.map((item) => (
                <ActiveLink
                  href={item.href}
                  key={item.name}
                  className="label font-semibold px-button-x py-3 border-b-2 border-b-background hover:bg-muted/50 rounded-lg transition-all text-center"
                >
                  {item.name}
                </ActiveLink>
              ))}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
