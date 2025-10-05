/**
 * Send Google Analytics event.
 */
export const sendGoogleEvent = (
  eventName: string,
  eventParams?: Record<string, unknown>,
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, eventParams);
  }
};

/**
 * Track component usage for analytics and monitoring.
 */
export const trackComponentUsage = (
  componentName: string,
  variant?: string,
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "component_usage", {
      component_name: componentName,
      component_variant: variant,
      page_path: window.location.pathname,
    });
  }
};

/**
 * Track component performance metrics.
 */
export const trackComponentPerformance = (
  componentName: string,
  renderTime: number,
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "component_performance", {
      component_name: componentName,
      render_time_ms: renderTime,
      timestamp: Date.now(),
    });
  }
};

/**
 * Track component errors.
 */
export const trackComponentError = (
  componentName: string,
  error: Error,
  errorInfo?: React.ErrorInfo,
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "component_error", {
      component_name: componentName,
      error_message: error.message,
      error_stack: error.stack,
      error_info: errorInfo,
      timestamp: Date.now(),
    });
  }
};
