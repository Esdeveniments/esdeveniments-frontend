# Component Library Monitoring Dashboard

## Overview

This document outlines the monitoring setup for the Que-Fer design system component library to track usage, performance, and errors in production.

## Metrics to Monitor

### 1. Component Usage Analytics

Track which components are most used and adoption rates:

```typescript
// Analytics tracking for component usage
const trackComponentUsage = (componentName: string, variant?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'component_usage', {
      component_name: componentName,
      component_variant: variant,
      page_path: window.location.pathname
    });
  }
};

// Usage in components
export const Button = ({ variant, ...props }) => {
  useEffect(() => {
    trackComponentUsage('Button', variant);
  }, [variant]);

  return <button {...props} />;
};
```

### 2. Performance Metrics

Monitor component render times and bundle size impact:

```typescript
// Performance tracking
const trackComponentPerformance = (
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
```

### 3. Error Tracking

Monitor component errors and failures:

```typescript
// Error boundary for component monitoring
class ComponentErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track component errors
    trackComponentError(this.props.componentName, error, errorInfo);
  }
}
```

## Dashboard Setup

### Google Analytics 4 Configuration

```javascript
// GA4 Configuration for component tracking
gtag("config", "GA_MEASUREMENT_ID", {
  custom_map: {
    custom_parameter_1: "component_name",
    custom_parameter_2: "component_variant",
    custom_parameter_3: "render_time_ms",
  },
});
```

### Custom Dashboard Queries

#### Component Usage by Page

```sql
SELECT
  page_path,
  component_name,
  COUNT(*) as usage_count
FROM component_usage_events
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY page_path, component_name
ORDER BY usage_count DESC
```

#### Component Performance Trends

```sql
SELECT
  component_name,
  AVG(render_time_ms) as avg_render_time,
  PERCENTILE_CONT(render_time_ms, 0.95) as p95_render_time
FROM component_performance_events
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY component_name
ORDER BY avg_render_time DESC
```

#### Error Rates by Component

```sql
SELECT
  component_name,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users
FROM component_error_events
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY component_name
ORDER BY error_count DESC
```

## Monitoring Alerts

### Performance Alerts

- Alert when average render time > 100ms for any component
- Alert when P95 render time > 500ms
- Alert when bundle size increases > 10%

### Usage Alerts

- Alert when component usage drops > 50% (potential migration issues)
- Alert when new components aren't being adopted

### Error Alerts

- Alert when error rate > 5% for any component
- Alert when new error types appear

## Implementation

### 1. Add Analytics to Base Components

Update the base component files to include tracking:

```typescript
// components/ui/primitives/Button/Button.tsx
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, children, ...props }, ref) => {
    useEffect(() => {
      trackComponentUsage('Button', variant);
    }, [variant]);

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant }), className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
```

### 2. Performance Monitoring Hook

```typescript
// hooks/useComponentPerformance.ts
export const useComponentPerformance = (componentName: string) => {
  const renderStart = useRef<number>();

  useLayoutEffect(() => {
    renderStart.current = performance.now();
  });

  useEffect(() => {
    if (renderStart.current) {
      const renderTime = performance.now() - renderStart.current;
      trackComponentPerformance(componentName, renderTime);
    }
  });
};
```

### 3. Error Boundary Setup

```typescript
// components/ui/ComponentErrorBoundary.tsx
export const ComponentErrorBoundary = ({
  componentName,
  children
}: {
  componentName: string;
  children: ReactNode;
}) => {
  return (
    <ErrorBoundary
      fallback={<div>Error in {componentName}</div>}
      onError={(error, errorInfo) => {
        trackComponentError(componentName, error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
```

## Dashboard Views

### Executive Summary

- Total component usage across the app
- Top 10 most used components
- Overall error rates
- Performance trends

### Component Details

- Individual component usage over time
- Performance metrics by component
- Error rates and types
- Adoption rates for new components

### Health Checks

- Components with high error rates
- Components with poor performance
- Components with low adoption
- Bundle size impact

## Maintenance

### Weekly Reviews

- Review top error components
- Check performance regressions
- Monitor adoption of new components

### Monthly Reports

- Component usage trends
- Performance improvements
- Error rate reductions
- Bundle size optimization results

## Integration with CI/CD

Add monitoring checks to deployment pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Check Component Health
  run: |
    npm run test:components
    npm run lighthouse:components
    npm run bundle-analyzer
```

## Resources

- [Google Analytics Documentation](https://developers.google.com/analytics)
- [Performance Monitoring Guide](https://web.dev/vitals/)
- [Error Tracking Best Practices](https://sentry.io/best-practices/)
