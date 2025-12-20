import { JSX, Suspense } from "react";
import type { BaseLayoutProps } from "types/common";
import Footer from "@components/ui/common/footer";
import Navbar from "@components/ui/common/navbar";
import NavigationProgress from "./NavigationProgress";

export default function BaseLayout({ children }: BaseLayoutProps): JSX.Element {
  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Navbar />
      <div
        className="w-full bg-background flex flex-col justify-center items-center overflow-hidden"
        data-testid="app-content"
      >
        {children}
      </div>
      <Footer />
    </>
  );
}
