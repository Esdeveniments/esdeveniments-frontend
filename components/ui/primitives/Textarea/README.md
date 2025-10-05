# Textarea Component

A rich textarea component with preview functionality, auto-expansion, character counting, and markdown-like text processing.

## Import

```tsx
import { Textarea } from "./Textarea";
```

## Basic Usage

```tsx
<Textarea
  id="description"
  label="Event Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>
```

## Props

| Prop         | Type                                            | Default | Description                                |
| ------------ | ----------------------------------------------- | ------- | ------------------------------------------ |
| `id`         | `string`                                        | -       | Unique identifier for the textarea element |
| `label`      | `string`                                        | -       | Label text displayed above the textarea    |
| `subtitle`   | `string`                                        | -       | Optional subtitle text below the label     |
| `error`      | `string`                                        | -       | Error message for validation failures      |
| `required`   | `boolean`                                       | `false` | Marks field as required                    |
| `helperText` | `string`                                        | -       | Helper text displayed below the textarea   |
| `className`  | `string`                                        | -       | Additional CSS classes                     |
| `value`      | `string`                                        | -       | Current textarea value                     |
| `onChange`   | `(e: ChangeEvent<HTMLTextAreaElement>) => void` | -       | Callback when value changes                |

## Examples

### With Preview Toggle

```tsx
<Textarea
  id="bio"
  label="Biography"
  subtitle="Tell us about yourself"
  value={bio}
  onChange={(e) => setBio(e.target.value)}
  required
/>
```

### With Error State

```tsx
<Textarea
  id="comments"
  label="Comments"
  error="Comments are required"
  helperText="Please provide your feedback"
  value={comments}
  onChange={(e) => setComments(e.target.value)}
/>
```

### With Character Limit

```tsx
<Textarea
  id="summary"
  label="Summary"
  value={summary}
  onChange={(e) => setSummary(e.target.value)}
  maxLength={500}
/>
```

## Features

- **Auto-expansion**: Textarea height adjusts automatically to content
- **Preview mode**: Toggle between edit and preview modes
- **Character counting**: Shows current/max characters
- **Text processing**: Automatically converts URLs to links
- **XSS protection**: Sanitizes HTML in preview mode

## Preview Mode

The textarea includes a preview toggle button that allows users to see how their text will be rendered. In preview mode:

- URLs are automatically converted to clickable links
- Text is processed with markdown-like formatting
- HTML is sanitized for security

## Accessibility

- Proper label association
- Error messages with `role="alert"`
- Keyboard navigation for preview toggle
- Screen reader friendly character count

## Best Practices

- Use for longer text inputs (>100 characters)
- Provide clear labels and helper text
- Consider character limits for data constraints
- Test preview functionality with various content types
- Ensure preview mode is accessible

## Styling

The component uses CVA for variant management with support for:

- Default, error, and success states
- Small, medium, and large sizes
- Focus and hover states
- Responsive design
