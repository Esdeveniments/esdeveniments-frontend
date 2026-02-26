"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Bars3Icon as MenuIcon,
  XMarkIcon as XIcon,
  PlusIcon,
  HomeIcon,
  CalendarIcon,
  HeartIcon,
  NewspaperIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
const PlusSmIcon = PlusIcon;
import Image from "next/image";
import ActiveLink from "@components/ui/common/link";
import PressableLink from "@components/ui/primitives/PressableLink";
import { useAuth } from "@components/hooks/useAuth";
import type { NavbarClientProps } from "types/props";

import LanguageSwitcher from "./LanguageSwitcher";

export default function NavbarClient({ navigation, labels }: NavbarClientProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const logoAlt = labels.logoAlt?.trim() || "Esdeveniments";

  const toggleMenu = useCallback(() => setIsMenuOpen((prev) => !prev), []);

  // Close mobile menu when pathname changes (navigation occurs)
  // This is a legitimate effect that synchronizes state with an external system (route)
  const previousPathname = useRef(pathname);
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing menu state with route changes is intentional
      setIsMenuOpen(false);
      setIsUserMenuOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  return (
    <nav
      id="site-navbar"
      className="w-full bg-background md:sticky md:top-0 z-50 border-b border-border/50 md:shadow-sm md:backdrop-blur-sm"
    >
      <div className="container bg-background py-2 h-14">
        <div className="h-full flex flex-col justify-center">
          <div className="flex justify-between items-center">
            <div className="flex flex-1 md:w-1/2 justify-start items-center py-2 px-3">
              <PressableLink
                href="/"
                prefetch={false}
                variant="inline"
                className="transition-transform duration-normal hover:scale-105"
                aria-label={logoAlt}
              >
                <Image
                  src="/static/images/logo-esdeveniments.webp"
                  className="bg-background flex justify-center items-center cursor-pointer"
                  alt={logoAlt}
                  width={190}
                  height={18}
                />
              </PressableLink>
            </div>

            <div className="flex justify-center items-center md:hidden">
              <button
                type="button"
                onClick={toggleMenu}
                className="inline-flex items-center justify-center py-2 px-3 rounded-button hover:bg-muted transition-interactive focus:outline-none"
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu-panel"
                aria-label={isMenuOpen ? labels.closeMenu : labels.openMenu}
              >
                {isMenuOpen ? (
                  <XIcon className="h-5 w-5" />
                ) : (
                  <MenuIcon className="h-5 w-5" />
                )}
              </button>
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

              {/* Desktop auth button / avatar dropdown */}
              {!isLoading && (
                isAuthenticated && user ? (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsUserMenuOpen((prev) => !prev)}
                      className="flex-center w-9 h-9 rounded-full bg-primary text-white text-sm font-bold hover:opacity-90 transition-interactive"
                      aria-label={labels.userMenu}
                      aria-expanded={isUserMenuOpen}
                    >
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        (user.displayName || user.email).charAt(0).toUpperCase()
                      )}
                    </button>
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 card-bordered card-body shadow-md bg-background z-50 rounded-lg">
                        <p className="body-small text-foreground/60 truncate mb-2">
                          {user.displayName || user.email}
                        </p>
                        {user.profileSlug && (
                          <ActiveLink
                            href={`/perfil/${user.profileSlug}`}
                            className="block w-full text-left label font-semibold text-foreground hover:text-primary transition-interactive py-1"
                          >
                            {labels.myProfile}
                          </ActiveLink>
                        )}
                        <button
                          type="button"
                          onClick={() => { logout(); setIsUserMenuOpen(false); }}
                          className="w-full text-left label font-semibold text-foreground hover:text-primary transition-interactive py-1"
                        >
                          {labels.logout}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <ActiveLink
                    href="/iniciar-sessio"
                    className="btn-outline label font-semibold whitespace-nowrap"
                  >
                    {labels.login}
                  </ActiveLink>
                )
              )}

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
                {isAuthenticated ? (
                  <ActiveLink
                    href="/preferits"
                    activeLinkClass="text-primary bg-primary/10"
                    className="flex-center p-3 rounded-full hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[44px] min-h-[44px]"
                    aria-label={labels.favorites}
                  >
                    <HeartIcon className="h-6 w-6" />
                  </ActiveLink>
                ) : (
                  <ActiveLink
                    href="/iniciar-sessio"
                    activeLinkClass="text-primary bg-primary/10"
                    className="flex-center p-3 rounded-full hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[44px] min-h-[44px]"
                    aria-label={labels.login}
                  >
                    <UserCircleIcon className="h-6 w-6" />
                  </ActiveLink>
                )}
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

      {isMenuOpen && (
        <div
          id="mobile-menu-panel"
          className="md:hidden relative z-50 bg-background border-b border-border shadow-md"
        >
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

            {/* Auth section */}
            {!isLoading && (
              <div className="pt-3 border-t border-border flex flex-col gap-2">
                {isAuthenticated && user ? (
                  <>
                    <p className="body-small text-foreground/60 text-center truncate">
                      {user.displayName || user.email}
                    </p>
                    {user.profileSlug && (
                      <ActiveLink
                        href={`/perfil/${user.profileSlug}`}
                        className="label font-semibold px-button-x py-3 hover:bg-muted/50 rounded-lg transition-all text-center"
                      >
                        {labels.myProfile}
                      </ActiveLink>
                    )}
                    <button
                      type="button"
                      onClick={() => { logout(); setIsMenuOpen(false); }}
                      className="label font-semibold px-button-x py-3 hover:bg-muted/50 rounded-lg transition-all text-center"
                    >
                      {labels.logout}
                    </button>
                  </>
                ) : (
                  <ActiveLink
                    href="/iniciar-sessio"
                    className="label font-semibold px-button-x py-3 hover:bg-muted/50 rounded-lg transition-all text-center"
                  >
                    {labels.login}
                  </ActiveLink>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-border flex justify-end items-center">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
