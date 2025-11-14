import { JSX, Suspense } from "react";
import type { BaseLayoutProps } from "types/common";
import Footer from "@components/ui/common/footer";
import Navbar from "@components/ui/common/navbar";
import ServiceWorkerRegistration from "@components/partials/ServiceWorkerRegistration";
import { NavigationProgress } from "@components/ui/navigation/NavigationProgress";

export default function BaseLayout({ children }: BaseLayoutProps): JSX.Element {
  return (
    <>
      <ServiceWorkerRegistration />
      <NavigationProgress />
      <Navbar />
      <div
        className="w-full bg-background flex flex-col justify-center items-center overflow-hidden"
        data-testid="app-content"
      >
        <Suspense fallback={null}>{children}</Suspense>
      </div>
      <Footer />
    </>
  );
}
