"use client";

import { JSX } from "react";
import type { BaseLayoutProps } from "types/common";
import Footer from "@components/ui/common/footer";
import Navbar from "@components/ui/common/navbar";
import ServiceWorkerRegistration from "@components/partials/ServiceWorkerRegistration";

export default function BaseLayout({ children }: BaseLayoutProps): JSX.Element {
  return (
    <>
      <ServiceWorkerRegistration />
      <Navbar />
      <div
        className="w-full bg-whiteCorp flex flex-col justify-center items-center overflow-hidden"
        data-testid="app-content"
      >
        {children}
      </div>
      <Footer />
    </>
  );
}
