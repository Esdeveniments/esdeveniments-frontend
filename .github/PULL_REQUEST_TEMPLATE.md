## Problem

<!-- What is wrong or missing, for whom. Link the issue or plan. -->

## Fix

<!-- What changed and why this approach. -->

## How to test

<!-- Commands and steps a reviewer can run. Paste failing-then-passing output for bug fixes. -->

- [ ] `yarn typecheck && yarn lint`
- [ ] `yarn test`

## Screenshots

<!-- UI changes: before and after, mobile width included. Delete if no UI change. -->

## Performance impact

<!-- Delete if none. Otherwise fill what applies. -->

- Client bundle: <!-- `yarn build && yarn analyze:cli` on the base branch and on this branch, or "no new client code" -->
- Interactions (INP): <!-- which clicks or inputs change, measured how (DevTools at 4x/20x CPU, React Scan) -->
- Field data to watch after deploy: <!-- GA4 `web_vitals` event, metric and page -->
