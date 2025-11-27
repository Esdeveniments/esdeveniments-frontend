/**
 * Generic filter operations using configuration-driven approach
 * All filter logic is centralized here
 */

import { FILTER_CONFIGURATIONS } from "config/filters";
import type { FilterDisplayState, FilterConfig } from "types/filters";
import type {
  URLFilterState,
  URLQueryParams,
  RouteSegments,
} from "types/url-filters";
import { buildFilterUrl } from "./url-filters";

export class FilterOperations {
  /**
   * Get filter configuration by key
   */
  static getConfig(filterKey: keyof URLFilterState): FilterConfig | undefined {
    return FILTER_CONFIGURATIONS.find((config) => config.key === filterKey);
  }

  /**
   * Generate removal URL for a specific filter
   */
  static getRemovalUrl(
    filterKey: keyof URLFilterState,
    segments: RouteSegments,
    queryParams: URLQueryParams
  ): string {
    const config = this.getConfig(filterKey);
    if (!config) return "/";

    // Handle special cases (e.g., home page redirect)
    if (config.specialCases?.homeRedirect?.(segments)) {
      return "/";
    }

    const changes = config.getRemovalChanges();
    return buildFilterUrl(segments, queryParams, changes);
  }

  /**
   * Check if a filter is currently enabled/active
   */
  static isEnabled(
    filterKey: keyof URLFilterState,
    state: FilterDisplayState
  ): boolean {
    const config = this.getConfig(filterKey);
    return config?.isEnabled(state) ?? false;
  }

  /**
   * Get display text for a filter
   */
  static getDisplayText(
    filterKey: keyof URLFilterState,
    state: FilterDisplayState
  ): string | undefined {
    const config = this.getConfig(filterKey);
    return config?.getDisplayText(state);
  }

  /**
   * Get all filter configurations
   */
  static getAllConfigurations(): FilterConfig[] {
    return FILTER_CONFIGURATIONS;
  }

  /**
   * Get enabled filter configurations
   */
  static getEnabledConfigurations(state: FilterDisplayState): FilterConfig[] {
    return FILTER_CONFIGURATIONS.filter((config) =>
      this.isEnabled(config.key, state)
    );
  }

  /**
   * Check if any filters are currently active
   */
  static hasActiveFilters(state: FilterDisplayState): boolean {
    return FILTER_CONFIGURATIONS.some((config) =>
      this.isEnabled(config.key, state)
    );
  }

  /**
   * Get default filter state based on configuration
   */
  static getDefaultFilterState(): Partial<URLFilterState> {
    const defaults: Partial<URLFilterState> = {};
    FILTER_CONFIGURATIONS.forEach((config) => {
      (defaults as Record<string, unknown>)[config.key] = config.defaultValue;
    });
    return defaults;
  }

  /**
   * Validate filter configuration integrity
   */
  static validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const keys = new Set<string>();

    FILTER_CONFIGURATIONS.forEach((config, index) => {
      // Check for duplicate keys
      if (keys.has(config.key)) {
        errors.push(`Duplicate filter key: ${config.key}`);
      }
      keys.add(config.key);

      // Check required properties
      if (!config.displayName) {
        errors.push(`Missing displayName for filter ${index}: ${config.key}`);
      }
      if (config.defaultValue === undefined) {
        errors.push(`Missing defaultValue for filter ${index}: ${config.key}`);
      }
      if (!config.isEnabled || typeof config.isEnabled !== "function") {
        errors.push(
          `Missing or invalid isEnabled function for filter ${index}: ${config.key}`
        );
      }
      if (
        !config.getDisplayText ||
        typeof config.getDisplayText !== "function"
      ) {
        errors.push(
          `Missing or invalid getDisplayText function for filter ${index}: ${config.key}`
        );
      }
      if (
        !config.getRemovalChanges ||
        typeof config.getRemovalChanges !== "function"
      ) {
        errors.push(
          `Missing or invalid getRemovalChanges function for filter ${index}: ${config.key}`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
