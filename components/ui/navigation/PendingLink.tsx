"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const [isPending, setIsPending] = useState(false);
  const { start, done } = useNavigationProgressStore();
  const prevPathnameRef = useRef(pathname);
  const pendingRef = useRef(false);

  // Reset pending state when pathname changes
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (pendingRef.current) {
        pendingRef.current = false;
        // Defer state update to avoid setState in effect warning
        const timerId = setTimeout(() => {
          setIsPending(false);
        }, 0);
        done(); // Also reset global progress
        // Clean up timeout if component unmounts before it executes
        return () => clearTimeout(timerId);
      }
    }
    // Return undefined cleanup function if no timeout was created
    return undefined;
  }, [pathname, done]);

  const handleClick = useCallback(() => {
    // Set pending immediately on click for instant feedback
    pendingRef.current = true;
    setIsPending(true);
    start(); // Also trigger global progress
  }, [start]);

  const combinedClassName = isPending
    ? `${className ?? ""} ${pendingClassName}`.trim()
    : className ?? "";

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      className={combinedClassName}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
