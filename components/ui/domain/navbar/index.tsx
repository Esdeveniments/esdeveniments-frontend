"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Disclosure } from "@headlessui/react";
import {
  MenuIcon,
  XIcon,
  PlusIcon as PlusSmIcon,
  HomeIcon,
  InformationCircleIcon as InfoIcon,
} from "@heroicons/react/outline";
import Image from "next/image";
import { Link as ActiveLink, Text } from "@components/ui/primitives";
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
      className="relative top-0 z-10 w-full bg-whiteCorp"
    >
      {({ open }) => (
        <>
          <div className="mx-auto h-14 bg-whiteCorp py-component-xs sm:w-[580px] md:w-[768px] lg:w-[1024px]">
            <div className="flex h-full flex-col justify-center">
              {/* FirstBar - Logo&LaptopMenu&MenuIcon */}
              <div className="flex items-center justify-around">
                {/* Logo */}
                <div className="flex w-full cursor-pointer items-center justify-start px-component-sm py-component-xs md:w-1/2">
                  <Link href="/">
                    <Image
                      src={logo}
                      className="flex cursor-pointer items-center justify-center bg-whiteCorp"
                      alt="Logo Esdeveniments.cat"
                      width={190}
                      height={18}
                      priority={true}
                    />
                  </Link>
                </div>
                {/* MenuIcon */}
                <div className="flex items-center justify-center md:hidden">
                  <Disclosure.Button
                    className="inline-flex items-center justify-center px-component-sm py-component-xs focus:outline-none"
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
                <div className="flex items-center justify-end md:w-1/2">
                  <div className="hidden gap-x-4 md:flex md:items-center">
                    {navigation.map((item) => (
                      <ActiveLink
                        href={item.href}
                        key={item.name}
                        className="border-b-2 border-b-whiteCorp"
                      >
                        {item.name}
                      </ActiveLink>
                    ))}
                  </div>
                </div>
              </div>
              {/* SecondBar - Search&Share&MenuIcon */}
              <div className="h-content fixed bottom-0 left-0 right-0 flex items-center justify-evenly gap-4xl bg-whiteCorp py-component-xs md:hidden">
                {/* Home */}
                <div className="flex cursor-pointer items-center justify-center rounded-xl">
                  <ActiveLink href="/">
                    <button
                      type="button"
                      className="flex cursor-pointer items-center rounded-xl border-b-whiteCorp p-component-xs focus:outline-none"
                      aria-label="Home"
                    >
                      <HomeIcon className="h-6 w-6" />
                    </button>
                  </ActiveLink>
                </div>

                {/* Share */}
                <div className="flex cursor-pointer items-center justify-center rounded-xl">
                  <ActiveLink href="/publica">
                    <button
                      type="button"
                      className="flex cursor-pointer items-center rounded-xl border-b-whiteCorp p-component-xs focus:outline-none"
                      aria-label="Publish"
                    >
                      <PlusSmIcon className="h-6 w-6" />
                      <Text className="hidden sm:visible">Publica</Text>
                    </button>
                  </ActiveLink>
                </div>

                {/* WhoAreWe */}
                <div className="flex cursor-pointer items-center justify-center rounded-xl">
                  <ActiveLink href="/qui-som">
                    <button
                      type="button"
                      className="flex cursor-pointer items-center rounded-xl border-b-whiteCorp p-component-xs focus:outline-none"
                      aria-label="WhoAreWe"
                    >
                      <InfoIcon className="h-6 w-6" />
                    </button>
                  </ActiveLink>
                </div>
              </div>
            </div>
          </div>
          {/* MenuPanel (md:hidden) */}
          <Disclosure.Panel className="md:hidden">
            <div className="relative flex w-full items-center justify-evenly bg-whiteCorp transition-transform">
              {navigation.map((item) => (
                <ActiveLink
                  href={item.href}
                  key={item.name}
                  className="border-b-2 border-b-whiteCorp"
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
