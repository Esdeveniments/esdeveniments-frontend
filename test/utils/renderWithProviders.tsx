import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { FilterLoadingProvider } from "../../components/context/FilterLoadingContext";

function Providers({ children }: { children: ReactNode }) {
  return <FilterLoadingProvider>{children}</FilterLoadingProvider>;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, {
    wrapper: Providers,
    ...options,
  });
}
