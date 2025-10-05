import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple className values and resolves Tailwind CSS conflicts
 *
 * This utility combines clsx (for conditional classes) and tailwind-merge
 * (for resolving Tailwind class conflicts) to provide a robust className
 * composition tool.
 *
 * @example
 * ```tsx
 * // Basic usage
 * cn("px-component-md py-component-xs", "bg-primary")
 * // => "px-component-md py-component-xs bg-primary"
 *
 * // Conditional classes
 * cn("px-component-md", isActive && "bg-primary", !isActive && "bg-darkCorp/80")
 * // => "px-component-md bg-primary" (when isActive = true)
 *
 * // Resolves conflicts (tailwind-merge)
 * cn("px-component-xs py-1", "px-component-md")
 * // => "py-1 px-component-md" (later px-component-md overrides px-component-xs)
 *
 * // Object syntax
 * cn({ "bg-primary": isActive, "bg-darkCorp/80": !isActive })
 *
 * // Array syntax
 * cn(["px-component-md", "py-component-xs"], isActive && "bg-primary")
 * ```
 *
 * @param inputs - Any number of className values (strings, objects, arrays, booleans, null, undefined)
 * @returns A single merged className string with conflicts resolved
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
