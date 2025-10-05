# Design System Code Review Checklist

This checklist ensures that all code changes comply with the Que-Fer design system standards. Reviewers should use this checklist during pull request reviews.

## 🎨 Colors & Design Tokens

- [ ] **No hardcoded hex colors**: All colors use design tokens (`primary`, `blackCorp`, `whiteCorp`, etc.)
- [ ] **No hardcoded RGB/HSL values**: Colors are defined in design tokens only
- [ ] **Proper semantic color usage**: Success, warning, error colors used appropriately
- [ ] **Consistent gray scale**: Uses `blackCorp` with opacity instead of arbitrary grays
- [ ] **Brand colors applied correctly**: `primary`, `secondary` used for appropriate contexts

## 📏 Spacing & Layout

- [ ] **No hardcoded spacing classes**: Uses design tokens (`component-md`, `page-x`, `gap-lg`, etc.)
- [ ] **Consistent spacing patterns**: Follows component spacing guidelines
- [ ] **Responsive spacing**: Uses appropriate tokens for different screen sizes
- [ ] **No arbitrary margin/padding**: All spacing comes from design system
- [ ] **Grid system usage**: Uses design system grid components when appropriate

## 📝 Typography

- [ ] **Text component usage**: Uses `<Text>` component instead of raw HTML elements
- [ ] **Proper heading hierarchy**: Uses `Text` variants (`h1`, `h2`, `h3`) for headings
- [ ] **Typography tokens**: Uses semantic tokens (`heading-1`, `body-lg`, etc.)
- [ ] **No hardcoded font classes**: No `text-xl`, `font-bold`, etc. in className
- [ ] **Consistent text sizing**: Follows typography scale from design system

## 🧩 Component Usage

- [ ] **Design system components**: Uses primitives (`Button`, `Card`, `Input`, etc.)
- [ ] **No raw HTML elements**: No `<h1>`, `<p>`, `<span>` with text classes
- [ ] **Component variants**: Uses appropriate component variants and sizes
- [ ] **Accessibility compliance**: Components include proper ARIA attributes
- [ ] **Component composition**: Uses component composition patterns correctly

## 🔧 Technical Implementation

- [ ] **ESLint compliance**: No design system ESLint rule violations
- [ ] **Design token imports**: Files using design system components import them properly
- [ ] **Consistent naming**: Follows component and token naming conventions
- [ ] **Performance considerations**: Uses appropriate loading states and skeletons
- [ ] **Responsive design**: Components work across all breakpoints

## 🧪 Testing & Documentation

- [ ] **Component tests**: New components include proper unit tests
- [ ] **Visual regression**: UI changes include visual tests
- [ ] **Accessibility tests**: Components tested for accessibility compliance
- [ ] **Documentation updated**: DESIGN_SYSTEM.md updated for new components/tokens
- [ ] **Usage examples**: New components documented with examples

## 🚀 Migration & Legacy Code

- [ ] **Migration scripts used**: Applied appropriate migration scripts for changes
- [ ] **Legacy code flagged**: Old hardcoded styles marked for future migration
- [ ] **Progressive enhancement**: Changes don't break existing functionality
- [ ] **Deprecation notices**: Old patterns include deprecation warnings

## 📋 Pull Request Requirements

### For Authors:

- [ ] Run `yarn audit:design-system` and fix all violations
- [ ] Run `yarn lint` and fix ESLint errors
- [ ] Test components across different screen sizes
- [ ] Include visual changes in PR description
- [ ] Update documentation if adding new components

### For Reviewers:

- [ ] Check all items in this checklist
- [ ] Verify design system compliance
- [ ] Test responsive behavior
- [ ] Review accessibility implications
- [ ] Ensure consistency with existing patterns

## 🛠️ Tools & Commands

```bash
# Run design system audit
yarn audit:design-system

# Run ESLint with design system rules
yarn lint

# Run migration scripts
yarn migrate-colors
yarn migrate-spacing
yarn migrate-text-classes

# Analyze current usage
yarn analyze-colors
yarn analyze-spacing
yarn analyze-typography
```

## 📚 Resources

- [Design System Documentation](DESIGN_SYSTEM.md)
- [Component Library](docs/COMPONENT_LIBRARY_ARCHITECTURE.md)
- [Migration Guide](docs/MIGRATION_CHECKLIST.md)
- [ESLint Rules](eslint-plugin-local.js)

## ⚡ Quick Fixes

### Colors

```tsx
// ❌ Wrong
<div className="text-gray-700 bg-gray-100">

// ✅ Correct
<div className="text-blackCorp bg-darkCorp">
```

### Spacing

```tsx
// ❌ Wrong
<div className="p-4 m-2">

// ✅ Correct
<div className="p-component-md m-component-sm">
```

### Typography

```tsx
// ❌ Wrong
<h1 className="text-2xl font-bold">Title</h1>

// ✅ Correct
<Text variant="h1">Title</Text>
```

### Components

```tsx
// ❌ Wrong
<button className="bg-blue-500 text-white px-4 py-2">Click</button>

// ✅ Correct
<Button variant="primary">Click</Button>
```

## 🚨 Blocking Issues

The following issues will block PR approval:

- Hardcoded hex colors in component code
- Raw HTML elements with text styling
- Missing design system component usage
- ESLint violations for design system rules
- Breaking changes to existing design system components

## 💡 Best Practices

- Always prefer design system components over custom implementations
- Use design tokens for all visual properties
- Test components in both light and dark modes (if applicable)
- Consider accessibility from the start
- Document any deviations from the design system
- Keep components small and focused on single responsibilities
