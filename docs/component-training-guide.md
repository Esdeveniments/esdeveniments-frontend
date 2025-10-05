# Component Library Training Guide

## Overview

This guide provides training materials for the Que-Fer design system component library. The library has been standardized with 15+ primitive components following consistent patterns.

## Key Concepts

### 1. Primitives vs. Domain Components

- **Primitives**: Low-level, reusable components (Button, Input, Card)
- **Domain**: Business-specific components (EventCard, Filters)

### 2. Design Tokens

All components use design tokens for:

- Colors: `primary`, `secondary`, `blackCorp`, `whiteCorp`
- Spacing: `component-xs`, `component-sm`, `component-md`
- Typography: `heading-1`, `body-md`, `caption`

### 3. Component Variants

Components use Class Variance Authority (CVA) for variants:

```tsx
const buttonVariants = cva("base-classes", {
  variants: {
    variant: { primary: "...", secondary: "..." },
    size: { sm: "...", md: "...", lg: "..." },
  },
});
```

## Component Usage Guide

### Button Component

```tsx
import { Button } from "@/components/ui/primitives";

// Primary action
<Button variant="primary" size="lg">Book Now</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// With loading state
<Button isLoading={loading}>Submit</Button>
```

### Form Components

```tsx
import { FormField, Input, Select, Textarea } from "@/components/ui/primitives";

<FormField label="Email" error={errors.email} required>
  <Input type="email" placeholder="your@email.com" />
</FormField>

<FormField label="Category">
  <Select options={categories} placeholder="Select category" />
</FormField>
```

### Card Component

```tsx
import { Card } from "@/components/ui/primitives";

// Basic card
<Card type="basic" variant="elevated">
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>

// Event card
<Card type="event-vertical" event={eventData} />
```

## Best Practices

### 1. Always Use Design Tokens

```tsx
// ✅ Good
<div className="bg-primary text-whiteCorp p-component-md">

// ❌ Bad
<div className="bg-red-500 text-white p-4">
```

### 2. Import from Primitives

```tsx
// ✅ Good
import { Button, Input, Card } from "@/components/ui/primitives";

// ❌ Bad
import Button from "@/components/ui/Button";
```

### 3. Use FormField for Forms

```tsx
// ✅ Good
<FormField label="Name" required>
  <Input />
</FormField>

// ❌ Bad
<div>
  <label>Name *</label>
  <input />
</div>
```

### 4. Handle Loading States

```tsx
// ✅ Good
<Button isLoading={submitting}>
  {submitting ? "Saving..." : "Save"}
</Button>

// ❌ Bad
<Button disabled={submitting}>
  {submitting ? "Saving..." : "Save"}
</Button>
```

## Migration Checklist

When updating existing components:

1. ✅ Replace hardcoded colors with design tokens
2. ✅ Replace arbitrary spacing with semantic tokens
3. ✅ Add proper TypeScript types
4. ✅ Add accessibility attributes
5. ✅ Add loading/error states
6. ✅ Update imports to use primitives
7. ✅ Add comprehensive tests
8. ✅ Update documentation

## Common Patterns

### Conditional Rendering

```tsx
{
  loading ? (
    <Skeleton variant="card" />
  ) : (
    <Card type="event-vertical" event={event} />
  );
}
```

### Error Handling

```tsx
<FormField error={errors.title}>
  <Input value={title} onChange={setTitle} />
</FormField>
```

### Responsive Design

```tsx
<Card className="w-full md:w-1/2 lg:w-1/3">Content</Card>
```

## Testing Guidelines

### Unit Tests

- Test all variants and sizes
- Test loading and error states
- Test accessibility with axe-core
- Test keyboard interactions

### Integration Tests

- Test form submissions
- Test component interactions
- Test responsive behavior

## Resources

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Complete documentation
- [Component Architecture](./docs/COMPONENT_LIBRARY_ARCHITECTURE.md)
- [Testing Guide](./docs/COMPONENT_TESTING_GUIDE.md)
- [Migration Guide](./docs/MIGRATION_CHECKLIST.md)

## Support

For questions about component usage:

1. Check DESIGN_SYSTEM.md first
2. Review component JSDoc comments
3. Ask in #design-system Slack channel
4. Create issue in component library repo
