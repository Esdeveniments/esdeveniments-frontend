// Deep-merges `extra` into a copy of `base`; `extra` wins on conflicts.
// Lives apart from client-namespaces.ts so the client chunk that imports it
// (ScopedMessagesProvider) doesn't carry the message lists.
export function mergeMessages(
  base: Record<string, unknown>,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const current = out[key];
    out[key] =
      isPlainObject(current) && isPlainObject(value)
        ? mergeMessages(current, value)
        : value;
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
