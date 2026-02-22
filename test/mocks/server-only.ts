// Mock for "server-only" package in Vitest.
// In Next.js, this package throws at import time in client bundles.
// In tests, we just need it to be a no-op.
export {};
