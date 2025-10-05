## Description

Brief description of the changes made in this PR.

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Design system update
- [ ] 🔧 Refactoring (no functional changes)
- [ ] ⚡ Performance improvement

## 🎨 Design System Compliance

- [ ] **Design System Audit**: Run `yarn audit:design-system` and fixed all violations
- [ ] **ESLint**: All design system ESLint rules pass
- [ ] **Color Tokens**: Uses design tokens instead of hardcoded colors
- [ ] **Spacing Tokens**: Uses design spacing tokens instead of arbitrary classes
- [ ] **Typography**: Uses `<Text>` component and typography tokens
- [ ] **Components**: Uses design system components instead of raw HTML
- [ ] **Migration**: Applied appropriate migration scripts if needed

## 🧪 Testing

- [ ] Unit tests pass (`yarn test`)
- [ ] E2E tests pass (`yarn test:e2e`)
- [ ] Visual regression tests (if applicable)
- [ ] Accessibility tests pass
- [ ] Tested on multiple screen sizes
- [ ] Tested on different browsers

## 📋 Checklist

- [ ] Code follows the project's coding standards
- [ ] Commit messages are clear and descriptive
- [ ] Documentation updated (if needed)
- [ ] No console errors or warnings
- [ ] Performance impact considered
- [ ] Security implications reviewed

## 🔗 Related Issues

Closes #ISSUE_NUMBER

## 📸 Screenshots (if applicable)

Add screenshots of UI changes here.

## 🚀 Deployment Notes

Any special deployment considerations or migrations needed?

---

## 👀 Code Review Checklist

**Reviewers, please ensure:**

- [ ] Code is well-structured and follows best practices
- [ ] Design system compliance (see [DESIGN_SYSTEM_CODE_REVIEW_CHECKLIST.md](../DESIGN_SYSTEM_CODE_REVIEW_CHECKLIST.md))
- [ ] No hardcoded styles or design tokens violations
- [ ] Proper error handling and edge cases covered
- [ ] Accessibility standards met
- [ ] Performance implications reviewed
- [ ] Tests are comprehensive and passing
- [ ] Documentation is accurate and complete

## 🛠️ Commands to Test

```bash
# Install dependencies
yarn install

# Run design system audit
yarn audit:design-system

# Run linting
yarn lint

# Run tests
yarn test

# Build application
yarn build
```
