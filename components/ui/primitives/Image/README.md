# Image

A unified image component that displays images with automatic fallback to gradient placeholders.

## Features

- Automatic image optimization with Next.js Image
- Graceful fallback to gradient placeholder when image fails or is missing
- Accessibility support with proper alt text and ARIA labels
- Network-aware quality optimization
- Loading states and error handling
- Responsive image sizing based on context

## Props

| Prop        | Type                                     | Default                                            | Description                                           |
| ----------- | ---------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `title`     | `string`                                 | -                                                  | **Required.** The title or name for the image content |
| `image`     | `string?`                                | -                                                  | Optional image URL to display                         |
| `alt`       | `string?`                                | `title`                                            | Alternative text for accessibility                    |
| `priority`  | `boolean?`                               | `false`                                            | Whether to prioritize loading                         |
| `quality`   | `number?`                                | -                                                  | Image quality setting (1-100)                         |
| `location`  | `string?`                                | -                                                  | Location info for fallback display                    |
| `region`    | `string?`                                | -                                                  | Region info for fallback display                      |
| `date`      | `string?`                                | -                                                  | Date info for fallback display                        |
| `context`   | `"card" \| "hero" \| "list" \| "detail"` | `"card"`                                           | Context for responsive sizing                         |
| `className` | `string?`                                | `"w-full h-full flex justify-center items-center"` | Additional CSS classes                                |

## Examples

### Basic Image

```tsx
<Image title="Event Title" image="/path/to/image.jpg" />
```

### Image with Custom Alt

```tsx
<Image
  title="Concert in Barcelona"
  image="/events/concert.jpg"
  alt="Crowd at the concert venue"
/>
```

### Fallback Only (No Image)

```tsx
<Image
  title="Jazz Night"
  location="Barcelona"
  region="Catalonia"
  date="2024-03-15"
/>
```

### Prioritized Loading

```tsx
<Image title="Hero Event" image="/hero.jpg" priority context="hero" />
```

## Accessibility

- Uses semantic `alt` text for images
- Fallback content includes `role="img"` and `aria-label` for screen readers
- Maintains consistent accessibility whether image loads or falls back

## Fallback Behavior

When no image is provided or the image fails to load, the component displays a gradient background with:

- Event title
- Location and region information
- Date
- Decorative tickets icon

The gradient is deterministically selected based on the title for visual variety.
