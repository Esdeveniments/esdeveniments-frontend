import { JSX, Suspense } from "react";
import type { BaseLayoutProps } from "types/common";
import Footer from "@components/ui/common/footer";
import Navbar from "@components/ui/common/navbar";
import NavigationProgress from "./NavigationProgress";
import LazyFavoriteLoginNudge from "@components/ui/common/favoriteButton/LazyFavoriteLoginNudge";

export default function BaseLayout({ children }: BaseLayoutProps): JSX.Element {
  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Navbar />
      {/* AdSense sets `height: auto; min-height: 0` (inline, !important) on
          every ancestor of an ad except html/body, so a min-height on <main>
          is gone once an ad loads, and the footer shows mid-screen under the
          next page's loading skeleton, then jumps away (field CLS, #697).
          The strut is never an ancestor of an ad: the row stays at least one
          screen tall and <main> stretches to fill it. */}
      <div className="flex w-full">
        <div aria-hidden="true" className="w-0 shrink-0 min-h-screen" />
        <main
          className="min-w-0 flex-1 bg-background flex flex-col items-center overflow-x-clip"
          data-testid="app-content"
        >
          {children}
        </main>
      </div>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      {/* Reads usePathname() and renders nothing on the server; the boundary
          stops it suspending the layout in generic shells. */}
      <Suspense fallback={null}>
        <LazyFavoriteLoginNudge />
      </Suspense>
    </>
  );
}
