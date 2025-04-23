import { usePathname } from "next/navigation";

export const useCheckPath = (): boolean => {
  const pathname = usePathname() ?? "";

  // Define the paths that should return true
  const truePaths: readonly string[] = ["/", "/[place]", "/[place]/[byDate]"] as const;

  // Define the paths that should return false
  const falsePaths: readonly string[] = [
    "/publica",
    "/qui-som",
    "/e/",
    "/sitemap",
    "/sitemap/[town]",
    "/sitemap/[town]/[year]",
    "/sitemap/[town]/[year]/[month]",
  ] as const;

  // Check if the current path matches any of the true paths
  const isTruePath: boolean = truePaths.some((path: string): boolean => pathname.startsWith(path));

  // Check if the current path matches any of the false paths
  const isFalsePath: boolean = falsePaths.some((path: string): boolean => pathname.startsWith(path));

  // Return true if the current path matches a true path and does not match a false path
  // Otherwise, return false
  return isTruePath && !isFalsePath;
};
