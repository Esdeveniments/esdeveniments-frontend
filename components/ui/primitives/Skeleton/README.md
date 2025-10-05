# Skeleton Component

A skeleton component for loading states with multiple variants, providing visual placeholders during content loading.

## Import

```tsx
import { Skeleton } from "./Skeleton";
```

## Basic Usage

```tsx
<Skeleton />
```

## Props

| Prop        | Type                           | Default  | Description            |
| ----------- | ------------------------------ | -------- | ---------------------- |
| `variant`   | `"card" \| "text" \| "avatar"` | `"text"` | Visual style variant   |
| `className` | `string`                       | -        | Additional CSS classes |

## Examples

### Variants

```tsx
{
  /* Text skeleton (default) */
}
<Skeleton className="h-4 w-32" />;

{
  /* Card skeleton */
}
<Skeleton variant="card" className="h-32 w-full" />;

{
  /* Avatar skeleton */
}
<Skeleton variant="avatar" className="h-10 w-10" />;
```

### Custom Dimensions

```tsx
{
  /* Custom text skeleton */
}
<Skeleton className="h-3 w-24" />;

{
  /* Custom card skeleton */
}
<Skeleton variant="card" className="h-48 w-64" />;

{
  /* Custom avatar skeleton */
}
<Skeleton variant="avatar" className="h-12 w-12" />;
```

## Features

- **Multiple variants**: Text, card, avatar shapes
- **Design token integration**: Uses `darkCorp` background and `animate-fast-pulse`
- **Flexible sizing**: Custom dimensions via className
- **Accessibility**: Proper ARIA attributes for screen readers

## Accessibility

- Uses `aria-busy` when appropriate in parent containers
- Semantic HTML structure
- Screen reader friendly during loading states

## Best Practices

- Match skeleton dimensions to actual content
- Use appropriate variants for different content types
- Combine multiple skeletons to mimic layout structure
- Test loading states across different screen sizes

## Styling

The component uses CVA for variant management with:

- `darkCorp` background color from design tokens
- `animate-fast-pulse` animation
- Rounded corners for different variants
- Consistent base styling for loading states
