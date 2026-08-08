"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import {
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
import { getProfileSlug } from "@utils/user-helpers";
import type { NavbarClientProps } from "types/props";
import type { Href } from "types/common";

import LanguageSwitcher from "./LanguageSwitcher";

export default function NavbarClient({ navigation, labels }: NavbarClientProps) {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const logoAlt = labels.logoAlt?.trim() || "Esdeveniments";

  // Build a URL-safe slug for the /perfil/{slug} URL. Prefer the
  // server-slugified username, fall back to a slugified display name, and
  // return an empty string when no safe slug is available. Never expose
  // email addresses or raw UUIDs.
  const profileSlug = getProfileSlug(user);

  // Until onboarding is done, the backend has no public profile document
  // under the fallback username yet, so /perfil/{slug} 404s. Send the user
  // to the completion form instead (same target as CompleteProfileGate).
  // Checked with `=== false`, not falsy: a transient backend enrichment
  // blip (lib/auth/enrichment.ts) leaves profileCompleted `undefined` for
  // an already-onboarded user too, and that must fall through to the
  // normal profile link, not the onboarding form.
  const profileHref: Href | null =
    user?.profileCompleted === false
      ? "/perfil/edita"
      : profileSlug
        ? `/perfil/${encodeURIComponent(profileSlug)}`
        : null;

  // Close the desktop user dropdown when pathname changes (navigation occurs)
  // This is a legitimate effect that synchronizes state with an external system (route)
  const previousPathname = useRef(pathname);
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing menu state with route changes is intentional
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
      className="w-full bg-background nav:sticky nav:top-0 z-50 border-b border-border/50 nav:shadow-sm nav:backdrop-blur-sm"
    >
      <div className="bg-background py-2 h-14">
        <div className="h-full flex flex-col justify-center">
          <div className="flex justify-between items-center">
            <div className="flex flex-1 nav:w-1/2 justify-start items-center py-2 px-3">
              <PressableLink
                href="/"
                prefetch={false}
                variant="inline"
                className="transition-transform duration-normal hover:scale-105"
                aria-label={logoAlt}
              >
                <Image
                  src="/static/images/logo-esdeveniments.webp"
                  className="bg-background flex justify-center items-center cursor-pointer !w-[clamp(140px,20vw,190px)] !h-auto max-w-full aspect-[190/18]"
                  alt={logoAlt}
                  width={190}
                  height={18}
                  loading="eager"
                />
              </PressableLink>
            </div>

            {/* Compact header: language switcher + direct link to profile/login.
                Used below the desktop navigation breakpoint; nav items live in the bottom bar.
                Logout lives on the profile page itself (see ProfileOwnerActions). */}
            <div
              className="flex nav:hidden justify-end items-center gap-2"
              data-testid="compact-navbar-actions"
            >
              <LanguageSwitcher />
              {!isLoading && (
                isAuthenticated && user && !user.profileEnrichmentFailed ? (
                  <PressableLink
                    href={profileHref || "/perfil/edita"}
                    prefetch={false}
                    variant="inline"
                    className="flex-center w-11 h-11 rounded-full bg-primary text-white text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={labels.myProfile}
                    data-testid="mobile-avatar-link"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover bg-background"
                      />
                    ) : (
                      (user.name || user.email).charAt(0).toUpperCase()
                    )}
                  </PressableLink>
                ) : (
                  <ActiveLink
                    href="/iniciar-sessio"
                    className="flex-center w-11 h-11 rounded-button hover:bg-muted transition-interactive focus:outline-none"
                    aria-label={
                      user?.profileEnrichmentFailed
                        ? labels.incompleteProfile
                        : labels.login
                    }
                    data-testid="mobile-login-link"
                    data-analytics-action="navbar_login_mobile_header"
                  >
                    <UserCircleIcon className="h-10 w-10" />
                  </ActiveLink>
                )
              )}
            </div>

            <div
              className="hidden nav:flex nav:w-1/2 justify-end items-center gap-3"
              data-testid="desktop-navbar-actions"
            >
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

              {/* Desktop auth: avatar dropdown with profile + logout */}
              {!isLoading && (
                isAuthenticated && user ? (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsUserMenuOpen((prev) => !prev)}
                      className="flex-center w-9 h-9 rounded-full bg-primary text-white text-sm font-bold hover:opacity-90 transition-interactive focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={labels.userMenu}
                      aria-expanded={isUserMenuOpen}
                      data-testid="user-avatar-button"
                    >
                      {user.avatarUrl ? (
                        // bg-background: the button behind this is bg-primary (for
                        // the fallback-letter case). A transparent-background
                        // upload (e.g. a logo) would otherwise let that red bleed
                        // through instead of showing the actual image cleanly.
                        <img
                          src={user.avatarUrl}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover bg-background"
                        />
                      ) : (
                        (user.name || user.email).charAt(0).toUpperCase()
                      )}
                    </button>
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 card-bordered card-body shadow-md bg-background z-50 rounded-lg" data-testid="user-dropdown-menu">
                        <p className="body-small text-foreground/60 truncate mb-2">
                          {user.name || user.email}
                        </p>
                        {/* Surface "incomplete session" when the id_token is
                              valid but the backend rejected our Bearer (or was
                              unreachable). Without this, the user sees an empty
                              dropdown — no profile link, only logout — and
                              can't tell why. Clicking logout re-enters the
                              Logto flow and may fix a stale cookie. */}
                        {user.profileEnrichmentFailed && (
                          <p
                            className="body-small text-error mb-1 py-1"
                            data-testid="navbar-session-warning"
                            role="status"
                            aria-live="polite"
                          >
                            {labels.incompleteProfile}
                          </p>
                        )}
                        {profileHref && !user.profileEnrichmentFailed && (
                          <ActiveLink
                            href={profileHref}
                            className="block w-full text-left label font-semibold text-foreground hover:text-primary transition-interactive py-1"
                          >
                            {labels.myProfile}
                          </ActiveLink>
                        )}
                        <button
                          type="button"
                          onClick={() => { logout(); setIsUserMenuOpen(false); }}
                          className="w-full text-left label font-semibold text-foreground hover:text-primary transition-interactive py-1"
                          data-analytics-action="navbar_logout_desktop"
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
                    data-analytics-action="navbar_login_desktop"
                  >
                    {labels.login}
                  </ActiveLink>
                )
              )}

              <LanguageSwitcher />
            </div>
          </div>

          <div
            className="fixed bottom-0 left-0 right-0 h-16 border-t border-border nav:hidden z-50 shadow-lg"
            data-testid="mobile-bottom-nav"
          >
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
    </nav>
  );
}
