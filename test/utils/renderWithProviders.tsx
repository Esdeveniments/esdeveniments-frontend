import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { FilterLoadingProvider } from "../../components/context/FilterLoadingContext";
import { UrlFiltersProvider } from "../../components/context/UrlFiltersContext";

function MinimalProviders({ children }: { children: ReactNode }) {
  return <FilterLoadingProvider>{children}</FilterLoadingProvider>;
}

function FullProviders({ children }: { children: ReactNode }) {
  return (
    <FilterLoadingProvider>
      <UrlFiltersProvider>{children}</UrlFiltersProvider>
    </FilterLoadingProvider>
  );
}

/**
 * Render with test providers.
 * Pass `withUrlFilters: true` when the component under test consumes
 * `useSharedUrlFilters()` (requires usePathname/useSearchParams mocked).
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { withUrlFilters?: boolean }
) {
  const { withUrlFilters, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: withUrlFilters ? FullProviders : MinimalProviders,
    ...renderOptions,
  });
}
