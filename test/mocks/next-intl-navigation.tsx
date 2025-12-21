import React from "react";
import { vi } from "vitest";

type RoutingConfig = {
  defaultLocale?: string;
  locales?: string[];
  localePrefix?: string | "as-needed" | "always";
};

export const defineRouting = (config: RoutingConfig) => config;

export const createNavigation = (_routing: RoutingConfig) => {
  const useRouter = () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  });

  const usePathname = () => "/";
  const getPathname = () => "/";

  const Link = ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname?: string };
    children: React.ReactNode;
  }) => {
    const resolvedHref =
      typeof href === "string" ? href : href?.pathname || "/";
    return (
      <a href={resolvedHref} {...rest}>
        {children}
      </a>
    );
  };

  const redirect = (url: string) => {
    // Match Next.js redirect semantics in tests
    throw new Error(`Redirect to ${url}`);
  };

  return { Link, redirect, usePathname, useRouter, getPathname };
};

