"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@lib/auth/session";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) router.replace("/auth/login");
    })();
  }, [router]);

  return <>{children}</>;
}