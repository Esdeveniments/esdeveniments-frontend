"use client";

import { usePathname } from "next/navigation";
import { Disclosure } from "@headlessui/react";
import {
  Bars3Icon as MenuIcon,
  XMarkIcon as XIcon,
  PlusIcon,
  HomeIcon,
  CalendarIcon,
  HeartIcon,
  NewspaperIcon,
} from "@heroicons/react/24/outline";
const PlusSmIcon = PlusIcon;
import Image from "next/image";

import ActiveLink from "@components/ui/common/link";
import PressableLink from "@components/ui/primitives/PressableLink";
import logo from "@public/static/images/logo-esdeveniments.webp";
import type { NavbarClientProps } from "types/props";

import LanguageSwitcher from "./LanguageSwitcher";

export default function NavbarClient({ navigation, labels }: NavbarClientProps) {
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
              <div className="flex justify-between items-center">
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
                      alt={labels.logoAlt}
                      width={190}
                      height={18}
                      priority={true}
                    />
                  </PressableLink>
                </div>

                <div className="flex justify-center items-center md:hidden">
                  <Disclosure.Button
                    className="inline-flex items-center justify-center py-2 px-3 rounded-button hover:bg-muted transition-interactive focus:outline-none"
                    aria-label={open ? labels.closeMenu : labels.openMenu}
                  >
                    {open ? (
                      <XIcon className="h-5 w-5" />
                    ) : (
                      <MenuIcon className="h-5 w-5" />
                    )}
                  </Disclosure.Button>
                </div>

                <div className="hidden md:flex md:w-1/2 justify-end items-center gap-3">
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
                  <LanguageSwitcher />
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 h-16 border-t border-border md:hidden z-50 shadow-lg">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-background/95 backdrop-blur-md pointer-events-none"
                />
                <div className="relative h-full flex justify-evenly items-center gap-2 px-section-x">
                  <div className="flex-center">
                    <ActiveLink
                      href="/"
                      activeLinkClass="text-primary bg-primary/10"
                      className="flex-center p-3 rounded-full hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[44px] min-h-[44px]"
                      aria-label={labels.home}
                    >
                      <HomeIcon className="h-6 w-6" />
                    </ActiveLink>
                  </div>

                  <div className="flex-center">
                    <ActiveLink
                      href="/catalunya"
                      activeLinkClass="text-primary bg-primary/10"
                      className="flex-center p-3 rounded-full hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[44px] min-h-[44px]"
                      aria-label={labels.agenda}
                    >
                      <CalendarIcon className="h-6 w-6" />
                    </ActiveLink>
                  </div>

                  <div className="flex-center">
                    <ActiveLink
                      href="/preferits"
                      activeLinkClass="text-primary bg-primary/10"
                      className="flex-center p-3 rounded-full hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[44px] min-h-[44px]"
                      aria-label={labels.favorites}
                    >
                      <HeartIcon className="h-6 w-6" />
                    </ActiveLink>
                  </div>

                  <div className="flex-center">
                    <ActiveLink
                      href="/publica"
                      activeLinkClass="text-primary bg-primary/10"
                      className="flex-center gap-2 px-4 py-3 rounded-full hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]"
                      aria-label={labels.publish}
                    >
                      <PlusSmIcon className="h-6 w-6" />
                      <span className="hidden sm:block label font-semibold">
                        {labels.mobilePublishLabel}
                      </span>
                    </ActiveLink>
                  </div>

                  <div className="flex-center">
                    <ActiveLink
                      href="/noticies"
                      activeLinkClass="text-primary bg-primary/10"
                      className="flex-center p-3 rounded-full hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[44px] min-h-[44px]"
                      aria-label={labels.news}
                    >
                      <NewspaperIcon className="h-6 w-6" />
                    </ActiveLink>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
              <div className="pt-3 border-t border-border flex justify-end items-center">
                <LanguageSwitcher />
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
