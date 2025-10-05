# Select Component

A customizable select dropdown component built on react-select, featuring search functionality, creatable options, and integration with the FormField component.

## Import

```tsx
import { Select } from "./Select";
```

## Basic Usage

```tsx
<Select
  id="category"
  label="Category"
  options={[
    { value: "music", label: "Music" },
    { value: "sports", label: "Sports" },
    { value: "art", label: "Art" },
  ]}
  onChange={(option) => console.log(option)}
/>
```

## Props

| Prop               | Type                               | Default       | Description                              |
| ------------------ | ---------------------------------- | ------------- | ---------------------------------------- |
| `id`               | `string`                           | -             | Unique identifier for the select element |
| `label`            | `string`                           | -             | Label text displayed above the field     |
| `subtitle`         | `string`                           | -             | Optional subtitle text below the label   |
| `error`            | `string`                           | -             | Error message for validation failures    |
| `required`         | `boolean`                          | `false`       | Marks field as required                  |
| `value`            | `Option \| null`                   | `null`        | Currently selected option                |
| `onChange`         | `(option: Option \| null) => void` | -             | Callback when selection changes          |
| `options`          | `Option[]`                         | `[]`          | Array of available options               |
| `isDisabled`       | `boolean`                          | `false`       | Disables the select input                |
| `isValidNewOption` | `(inputValue: string) => boolean`  | `() => false` | Function to validate new options         |
| `isClearable`      | `boolean`                          | `false`       | Allows clearing the selected value       |
| `placeholder`      | `string`                           | `"una opció"` | Placeholder text when no option selected |

## Examples

### Creatable Select

```tsx
<Select
  id="location"
  label="Location"
  isValidNewOption={() => true}
  options={[]}
  onChange={(option) => console.log(option)}
  placeholder="Select or create a location"
/>
```

### With Error State

```tsx
<Select
  id="priority"
  label="Priority"
  error="Please select a priority level"
  required
  options={[
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ]}
  onChange={(option) => console.log(option)}
/>
```

### Clearable Select

```tsx
<Select
  id="tags"
  label="Tags"
  isClearable
  options={[
    { value: "urgent", label: "Urgent" },
    { value: "important", label: "Important" },
    { value: "optional", label: "Optional" },
  ]}
  onChange={(option) => console.log(option)}
/>
```

### Disabled Select

```tsx
<Select
  id="readonly"
  label="Read Only Field"
  isDisabled
  options={[{ value: "option1", label: "Option 1" }]}
  value={{ value: "option1", label: "Option 1" }}
  onChange={() => {}}
/>
```

## Option Format

Options should follow the `Option` type structure:

```tsx
type Option = {
  value: string;
  label: string;
};
```

## Features

- **Searchable**: Type to filter options
- **Creatable**: Allow users to create new options
- **Clearable**: Option to clear selection
- **Accessible**: Full keyboard navigation and screen reader support
- **Customizable**: Extensive styling options via react-select

## Accessibility

- Proper ARIA attributes for screen readers
- Keyboard navigation support
- Focus management
- Error announcements

## Best Practices

- Provide meaningful placeholder text
- Use `isValidNewOption` to control when new options can be created
- Include error handling for validation
- Test keyboard navigation
- Consider performance with large option lists
