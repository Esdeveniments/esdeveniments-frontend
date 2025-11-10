"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
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
import { NavigationItem } from "types/common";

const navigation: NavigationItem[] = [
  { name: "Agenda", href: "/", current: true },
  { name: "Publicar", href: "/publica", current: false },
  { name: "Notícies", href: "/noticies", current: false },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <Disclosure
      key={pathname}
      as="nav"
      id="site-navbar"
      className="w-full bg-background md:sticky md:top-0 z-50 border-b border-border/50"
    >
      {({ open }) => (
        <>
          <div className="container bg-background py-2 h-14">
            <div className="h-full flex flex-col justify-center">
              {/* FirstBar - Logo&LaptopMenu&MenuIcon */}
              <div className="flex justify-between items-center">
                {/* Logo */}
                <div className="flex flex-1 md:w-1/2 justify-start items-center py-2 px-3 cursor-pointer">
                  <Link href="/">
                    <Image
                      src={logo}
                      className="bg-background flex justify-center items-center cursor-pointer"
                      alt="Logo Esdeveniments.cat"
                      width={190}
                      height={18}
                      priority={true}
                    />
                  </Link>
                </div>
                {/* MenuIcon */}
                <div className="flex justify-center items-center md:hidden">
                  <Disclosure.Button
                    className="inline-flex items-center justify-center py-2 px-3 focus:outline-none"
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
                  <div className="flex-center gap-element-gap">
                    {navigation.map((item) => (
                      <ActiveLink
                        href={item.href}
                        key={item.name}
                        className="label px-button-x py-button-y border-b-2 border-b-background"
                      >
                        {item.name}
                      </ActiveLink>
                    ))}
                  </div>
                </div>
              </div>
              {/* SecondBar - Search&Share&MenuIcon */}
              <div className="fixed bottom-0 left-0 right-0 h-14 border-t-2 border-border bg-background flex justify-evenly items-center gap-element-gap md:hidden px-section-x z-50 shadow-sm">
                {/* Home */}
                <div className="flex-center cursor-pointer">
                  <ActiveLink href="/">
                    <button
                      type="button"
                      className="flex-center p-2 focus:outline-none cursor-pointer"
                      aria-label="Home"
                    >
                      <HomeIcon className="h-6 w-6" />
                    </button>
                  </ActiveLink>
                </div>

                {/* Share */}
                <div className="flex-center cursor-pointer">
                  <ActiveLink href="/publica">
                    <button
                      type="button"
                      className="flex-center gap-element-gap-sm p-2 focus:outline-none cursor-pointer"
                      aria-label="Publish"
                    >
                      <PlusSmIcon className="h-6 w-6" />
                      <span className="hidden sm:block label">Publica</span>
                    </button>
                  </ActiveLink>
                </div>

                {/* Notícies */}
                <div className="flex-center cursor-pointer">
                  <ActiveLink href="/noticies">
                    <button
                      type="button"
                      className="flex-center p-2 focus:outline-none cursor-pointer"
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
          <Disclosure.Panel className="md:hidden">
            <div className="w-full relative flex justify-evenly items-center bg-background transition-transform">
              {navigation.map((item) => (
                <ActiveLink
                  href={item.href}
                  key={item.name}
                  className="label px-button-x py-button-y border-b-2 border-b-background"
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
