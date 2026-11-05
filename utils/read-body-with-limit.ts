/**
 * Reads a response body into memory, or returns null once it grows past
 * `maxBytes`. Leaving the loop early cancels the stream.
 */
export async function readBodyWithLimit(
  body: AsyncIterable<Uint8Array>,
  maxBytes: number,
): Promise<Buffer | null> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of body) {
    total += chunk.byteLength;
    if (total > maxBytes) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
