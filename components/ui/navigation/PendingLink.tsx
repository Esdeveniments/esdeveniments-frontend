"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigationProgressStore } from "@components/hooks/useNavigationProgress";
import type { PendingLinkProps } from "types/common";

export function PendingLink({
  children,
  className,
  pendingClassName = "opacity-60 cursor-wait",
  href,
  ...props
}: PendingLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const { start, done } = useNavigationProgressStore();
  const prevPathRef = useRef(pathname + (searchParams?.toString() || ""));
  const pendingRef = useRef(false);

  // Reset pending state when pathname or searchParams change
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const currentPath = pathname + (searchParams?.toString() || "");
    if (prevPathRef.current !== currentPath) {
      prevPathRef.current = currentPath;
      if (pendingRef.current) {
        pendingRef.current = false;
        // Defer state update to avoid setState in effect warning
        timerId = setTimeout(() => {
          setIsPending(false);
        }, 0);
        done(); // Also reset global progress
      }
    }

    // Clean up timeout if component unmounts before it executes
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [pathname, searchParams, done]);

  const handleClick = useCallback(() => {
    // Don't set pending if navigating to current page
    if (href === pathname) {
      return;
    }
    // Set pending immediately on click for instant feedback
    pendingRef.current = true;
    setIsPending(true);
    start(); // Also trigger global progress
  }, [start, href, pathname]);

  const combinedClassName = isPending
    ? `${className ?? ""} ${pendingClassName}`.trim()
    : className ?? "";

  return (
    <Link
      {...props}
      href={href}
      prefetch={true}
      className={combinedClassName}
      onClick={handleClick}
      aria-busy={isPending}
    >
      {children}
    </Link>
  );
}
