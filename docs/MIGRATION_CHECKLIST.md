# Component Migration Checklist

Include this checklist in PR descriptions when migrating components into the new library.

1. ✅ Props imported from `types/ui`
2. ✅ Variant/size maps created in `<Component>.constants.ts`
3. ✅ Implementation uses `cn` helper and exported variants
4. ✅ Accessibility attributes + keyboard behavior addressed
5. ✅ Unit tests & `jest-axe` accessibility tests added
6. ✅ Documentation updated (JSDoc, README/Storybook)
7. ✅ Legacy imports updated to use new component path
8. ✅ Old component removed once usage is migrated
