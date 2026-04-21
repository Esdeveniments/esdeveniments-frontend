import { JSX, Suspense } from "react";
import type { BaseLayoutProps } from "types/common";
import Footer from "@components/ui/common/footer";
import Navbar from "@components/ui/common/navbar";
import NavigationProgress from "./NavigationProgress";
import LazySocialFollowPopup from "@components/ui/common/social/LazySocialFollowPopup";

export default function BaseLayout({ children }: BaseLayoutProps): JSX.Element {
  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Suspense
        fallback={
          <div
            aria-hidden="true"
            className="w-full bg-background md:sticky md:top-0 z-50 border-b border-border/50 md:shadow-sm md:backdrop-blur-sm"
          >
            <div className="container bg-background py-2 h-14" />
          </div>
        }
      >
        <Navbar />
      </Suspense>
      <main
        className="w-full min-h-screen bg-background flex flex-col items-center overflow-hidden"
        data-testid="app-content"
      >
        {children}
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <Suspense fallback={null}>
        <LazySocialFollowPopup />
      </Suspense>
    </>
  );
}
