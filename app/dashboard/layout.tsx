"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@lib/auth/session";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/auth/login");
    }
  }, [router]);

  return <>{children}</>;
}