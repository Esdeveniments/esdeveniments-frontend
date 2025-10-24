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
      className="w-full bg-whiteCorp relative top-0 z-10"
    >
      {({ open }) => (
        <>
          <div className="container bg-whiteCorp py-2 h-14">
            <div className="h-full flex flex-col justify-center">
              {/* FirstBar - Logo&LaptopMenu&MenuIcon */}
              <div className="flex justify-around items-center">
                {/* Logo */}
                <div className="flex w-full md:w-1/2 justify-start items-center py-2 px-3 cursor-pointer">
                  <Link href="/">
                    <Image
                      src={logo}
                      className="bg-whiteCorp flex justify-center items-center cursor-pointer"
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
                <div className="md:w-1/2 flex justify-end items-center">
                  <div className="hidden md:flex md:items-center gap-x-4">
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
              <div className="fixed h-content bottom-0 left-0 right-0 py-2 bg-whiteCorp flex justify-evenly items-center gap-16 md:hidden">
                {/* Home */}
                <div className="flex justify-center items-center rounded-xl cursor-pointer">
                  <ActiveLink href="/">
                    <button
                      type="button"
                      className="flex items-center p-2 border-b-whiteCorp focus:outline-none cursor-pointer rounded-xl"
                      aria-label="Home"
                    >
                      <HomeIcon className="h-6 w-6" />
                    </button>
                  </ActiveLink>
                </div>

                {/* Share */}
                <div className="flex justify-center items-center rounded-xl cursor-pointer">
                  <ActiveLink href="/publica">
                    <button
                      type="button"
                      className="flex items-center p-2 border-b-whiteCorp focus:outline-none cursor-pointer rounded-xl"
                      aria-label="Publish"
                    >
                      <PlusSmIcon className="h-6 w-6" />
                      <span className="hidden sm:visible">Publica</span>
                    </button>
                  </ActiveLink>
                </div>

                {/* WhoAreWe */}
                <div className="flex justify-center items-center rounded-xl cursor-pointer">
                  <ActiveLink href="/qui-som">
                    <button
                      type="button"
                      className="flex items-center p-2 border-b-whiteCorp focus:outline-none cursor-pointer rounded-xl"
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
            <div className="w-full relative flex justify-evenly items-center bg-whiteCorp transition-transform">
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
