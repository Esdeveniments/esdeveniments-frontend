import { JSX } from "react";
import type { BaseLayoutProps } from "types/common";
import Footer from "@components/ui/domain/footer";
import Navbar from "@components/ui/domain/navbar";
import ServiceWorkerRegistration from "@components/partials/ServiceWorkerRegistration";

export default function BaseLayout({ children }: BaseLayoutProps): JSX.Element {
  return (
    <>
      <ServiceWorkerRegistration />
      <Navbar />
      <div
        className="flex w-full flex-col items-center justify-center overflow-hidden bg-whiteCorp"
        data-testid="app-content"
      >
        {children}
      </div>
      <Footer />
    </>
  );
}
