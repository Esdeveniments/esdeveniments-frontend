# Modal

A primitive UI component for displaying modal dialogs.

## Usage

```tsx
import Modal from "./index";

<Modal open={isOpen} onClose={() => setIsOpen(false)} title="My Modal">
  <p>Modal content goes here.</p>
</Modal>;
```

## Props

| Prop      | Type            | Default | Description                              |
| --------- | --------------- | ------- | ---------------------------------------- |
| open      | boolean         | -       | Whether the modal is open                |
| onClose   | () => void      | -       | Callback when the modal should be closed |
| title     | string          | -       | Optional title for the modal             |
| children  | React.ReactNode | -       | Content to display inside the modal      |
| className | string          | -       | Additional CSS classes                   |

## Features

- Click outside to close
- Escape key to close
- Focus management
- Scroll lock when open
- Accessible with proper ARIA labels
