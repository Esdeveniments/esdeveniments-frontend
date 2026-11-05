const MAX_CAUSE_DEPTH = 5;

/** An error followed by each error in its `cause` chain. */
export function getErrorChain(error: unknown): NodeJS.ErrnoException[] {
  const chain: NodeJS.ErrnoException[] = [];
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
    chain.push(current);
    current = current.cause;
  }
  return chain;
}
