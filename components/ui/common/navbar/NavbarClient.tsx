"use client";

import { useEffect } from "react";
import Image from "next/image";

import { UserCircleIcon } from "@heroicons/react/24/outline";
import ActiveLink from "@components/ui/common/link";
import { SPRITE_ICON } from "@components/ui/common/IconSprite";
import PressableLink from "@components/ui/primitives/PressableLink";
import { useAuth } from "@components/hooks/useAuth";
import { getProfileSlug } from "@utils/user-helpers";
import { SIGNED_IN_HINT_KEY } from "@utils/constants";
import type { NavbarClientProps } from "types/props";
import type { Href } from "types/common";

import LanguageSwitcher from "./LanguageSwitcher";
import NavbarLoginLink from "./NavbarLoginLink";

// The login link and the invisible copy that holds its place while auth
// loads share these classes, so the reserved width matches the real button.
const MOBILE_LOGIN_CLASS = "btn-outline btn-sm whitespace-nowrap";
const DESKTOP_LOGIN_CLASS = "btn-outline text-xs whitespace-nowrap";
// Hidden on browsers marked by SIGNED_IN_HINT_SCRIPT (styles/globals.css).
const AUTH_PLACEHOLDER_CLASS = "invisible auth-slot-placeholder";

// No usePathname() here: it suspends while Next prerenders the generic shell
// of routes with params, which would push the whole navbar out of the static
// HTML. Only ActiveLink (tiny boundary per link) and the client-only login
// link and language menu read it.

export default function NavbarClient({ navigation, labels }: NavbarClientProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const logoAlt = labels.logoAlt?.trim() || "Esdeveniments";
  const avatarUser =
    isAuthenticated && user && !user.profileEnrichmentFailed ? user : null;
  const showsAvatar = avatarUser !== null;

  // Remember what this browser shows, so SIGNED_IN_HINT_SCRIPT can reserve
  // the right width before the next page's first paint.
  useEffect(() => {
    if (isLoading) return;
    try {
      if (showsAvatar) localStorage.setItem(SIGNED_IN_HINT_KEY, "1");
      else localStorage.removeItem(SIGNED_IN_HINT_KEY);
    } catch {
      // Storage blocked: the slot just reserves the login button's width.
    }
  }, [isLoading, showsAvatar]);

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

  return (
    <nav
      id="site-navbar"
      className="site-navbar-safe-area w-full bg-background nav:sticky nav:top-0 z-50 border-b border-border/50 nav:shadow-sm nav:backdrop-blur-sm"
    >
      <div className="bg-background py-2 h-14">
        <div className="h-full flex flex-col justify-center">
          <div
            className="flex justify-between items-center px-section-x nav:px-0"
            data-testid="navbar-top-row"
          >
            <div className="flex flex-1 min-w-0 nav:w-1/2 justify-start items-center py-2 nav:px-3">
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
              className="flex nav:hidden shrink-0 justify-end items-center gap-2"
              data-testid="compact-navbar-actions"
            >
              <LanguageSwitcher compact />
              {/* Auth slot, as tall as the avatar. While auth loads it holds
                  the login button's width, or the avatar's (min-w-11) on a
                  browser that was signed in last time, so the header doesn't
                  move when auth resolves and the avatar never floats. */}
              <div className="flex h-11 min-w-11 shrink-0 items-center justify-end">
                {isLoading ? (
                  <span
                    className={`${MOBILE_LOGIN_CLASS} ${AUTH_PLACEHOLDER_CLASS}`}
                    aria-hidden="true"
                    data-testid="mobile-auth-slot"
                  >
                    <UserCircleIcon className="h-5 w-5" />
                    {labels.loginShort}
                  </span>
                ) : avatarUser ? (
                    <PressableLink
                      href={profileHref || "/perfil/edita"}
                      prefetch={false}
                      variant="inline"
                      className={`flex-center w-11 h-11 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                      aria-label={labels.myProfile}
                      data-testid="mobile-avatar-link"
                    >
                      {avatarUser.avatarUrl ? (
                        <img
                          src={avatarUser.avatarUrl}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover bg-background"
                        />
                      ) : (
                        <span className="flex-center w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {(avatarUser.name || avatarUser.email).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </PressableLink>
                  ) : (
                    <NavbarLoginLink
                      className={MOBILE_LOGIN_CLASS}
                      aria-label={
                        user?.profileEnrichmentFailed
                          ? `${labels.loginShort}. ${labels.incompleteProfile}`
                          : undefined
                      }
                      data-testid="mobile-login-link"
                      data-analytics-action="navbar_login_mobile_header"
                    >
                      <UserCircleIcon className="h-5 w-5" aria-hidden="true" />
                      {labels.loginShort}
                    </NavbarLoginLink>
                  )}
              </div>
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
                    className="label font-semibold px-button-x py-button-y border-b-2 border-b-background hover:bg-muted/50 rounded-t-lg transition-colors"
                  >
                    {item.name}
                  </ActiveLink>
                ))}
              </div>

              {/* Desktop auth slot, reserved the same way so the links don't move. */}
              <div className="flex min-w-9 items-center justify-end">
                {isLoading ? (
                  <span
                    className={`${DESKTOP_LOGIN_CLASS} ${AUTH_PLACEHOLDER_CLASS}`}
                    aria-hidden="true"
                  >
                    {labels.login}
                  </span>
                ) : avatarUser ? (
                    <PressableLink
                      href={profileHref || "/perfil/edita"}
                      prefetch={false}
                      variant="inline"
                      className={`flex-center w-9 h-9 rounded-full bg-primary text-white text-sm font-bold hover:opacity-90 transition-interactive focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                      aria-label={labels.myProfile}
                      data-testid="desktop-avatar-link"
                    >
                      {avatarUser.avatarUrl ? (
                        <img
                          src={avatarUser.avatarUrl}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover bg-background"
                        />
                      ) : (
                        (avatarUser.name || avatarUser.email).charAt(0).toUpperCase()
                      )}
                    </PressableLink>
                  ) : (
                    <NavbarLoginLink
                      className={DESKTOP_LOGIN_CLASS}
                      data-testid="desktop-login-link"
                      data-analytics-action="navbar_login_desktop"
                    >
                      {labels.login}
                    </NavbarLoginLink>
                  )}
              </div>

              <LanguageSwitcher />
            </div>
          </div>

          <div
            className="mobile-bottom-nav fixed bottom-0 left-0 right-0 border-t border-border nav:hidden z-50 shadow-lg"
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
                  className="bottom-nav-link"
                  aria-label={labels.home}
                >
                  <svg className="h-6 w-6" aria-hidden="true">
                    <use href={`#${SPRITE_ICON.home}`} />
                  </svg>
                </ActiveLink>
              </div>

              <div className="flex-center">
                <ActiveLink
                  href="/catalunya"
                  activeLinkClass="text-primary bg-primary/10"
                  className="bottom-nav-link"
                  aria-label={labels.agenda}
                >
                  <svg className="h-6 w-6" aria-hidden="true">
                    <use href={`#${SPRITE_ICON.calendar}`} />
                  </svg>
                </ActiveLink>
              </div>

              <div className="flex-center">
                <ActiveLink
                  href="/preferits"
                  activeLinkClass="text-primary bg-primary/10"
                  className="bottom-nav-link"
                  aria-label={labels.favorites}
                >
                  <svg className="h-6 w-6" aria-hidden="true">
                    <use href={`#${SPRITE_ICON.heartOutline}`} />
                  </svg>
                </ActiveLink>
              </div>

              <div className="flex-center">
                <ActiveLink
                  href="/publica"
                  activeLinkClass="text-primary bg-primary/10"
                  className="bottom-nav-link gap-2 px-4"
                  aria-label={labels.publish}
                >
                  <svg className="h-6 w-6" aria-hidden="true">
                    <use href={`#${SPRITE_ICON.plus}`} />
                  </svg>
                  <span className="hidden sm:block label font-semibold">
                    {labels.mobilePublishLabel}
                  </span>
                </ActiveLink>
              </div>

              <div className="flex-center">
                <ActiveLink
                  href="/noticies"
                  activeLinkClass="text-primary bg-primary/10"
                  className="bottom-nav-link"
                  aria-label={labels.news}
                >
                  <svg className="h-6 w-6" aria-hidden="true">
                    <use href={`#${SPRITE_ICON.newspaper}`} />
                  </svg>
                </ActiveLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
