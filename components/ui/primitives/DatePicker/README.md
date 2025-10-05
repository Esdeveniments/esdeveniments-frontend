# DatePicker Component

A date and time picker component built on react-datepicker with Catalan localization, providing start and end date/time selection.

## Import

```tsx
import { DatePicker } from "./DatePicker";
```

## Basic Usage

```tsx
<DatePicker
  label="Event Dates"
  onChange={(field, value) => console.log(field, value)}
/>
```

## Props

| Prop         | Type                                     | Default  | Description                                        |
| ------------ | ---------------------------------------- | -------- | -------------------------------------------------- |
| `idPrefix`   | `string`                                 | `"date"` | Prefix for generating unique IDs                   |
| `label`      | `string`                                 | -        | Label text displayed above the picker              |
| `subtitle`   | `string`                                 | -        | Optional subtitle text below the label             |
| `error`      | `string`                                 | -        | Error message for validation failures              |
| `required`   | `boolean`                                | `false`  | Marks date selection as required                   |
| `helperText` | `string`                                 | -        | Helper text displayed below the picker             |
| `startDate`  | `string`                                 | -        | Initial start date (ISO string or YYYY-MM-DD)      |
| `endDate`    | `string`                                 | -        | Initial end date (ISO string or YYYY-MM-DD)        |
| `minDate`    | `string`                                 | -        | Minimum selectable date (ISO string or YYYY-MM-DD) |
| `onChange`   | `(field: string, value: string) => void` | -        | Callback when dates change                         |
| `className`  | `string`                                 | -        | Additional CSS classes                             |

## Examples

### With Initial Values

```tsx
<DatePicker
  label="Booking Period"
  startDate="2024-01-15T10:00"
  endDate="2024-01-15T12:00"
  onChange={(field, value) => handleDateChange(field, value)}
  required
/>
```

### With Minimum Date and Validation

```tsx
<DatePicker
  label="Future Event"
  minDate="2024-01-01"
  error="Please select a future date"
  helperText="Events must be scheduled at least 24 hours in advance"
  onChange={(field, value) => setDate(field, value)}
/>
```

### With Subtitle

```tsx
<DatePicker
  label="Event Schedule"
  subtitle="Select the start and end times for your event"
  onChange={(field, value) => updateSchedule(field, value)}
/>
```

## Features

- **Dual date/time selection**: Separate start and end date/time pickers
- **Catalan localization**: Date picker in Catalan language
- **Time selection**: Includes hour and minute selection
- **Date validation**: Minimum date constraints
- **Auto-adjustment**: End date automatically adjusts if before start date
- **Custom styling**: Integrated with design system

## Date Format

- **Input format**: Accepts ISO strings (`YYYY-MM-DDTHH:mm`) or date-only (`YYYY-MM-DD`)
- **Default time**: If only date provided, defaults to 09:00
- **Output format**: Returns ISO strings (`YYYY-MM-DDTHH:mm`)

## Accessibility

- Proper label association for both start and end inputs
- Keyboard navigation support
- Screen reader friendly date selection
- Focus management and visual indicators

## Best Practices

- Always provide clear labels for start and end dates
- Use `minDate` to prevent past date selection when appropriate
- Include error handling for validation
- Test with different date ranges and edge cases
- Consider mobile responsiveness

## Styling

The component includes:

- Custom button inputs for date display
- Focus rings and hover states
- Responsive layout (stacked on mobile, side-by-side on desktop)
- Integration with FormField for consistent spacing
- Custom calendar header with navigation buttons
