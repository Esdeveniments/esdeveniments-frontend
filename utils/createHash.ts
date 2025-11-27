import { createHash as createHashFn } from "crypto";

export default function createHash(
  title: string,
  url: string,
  location: string,
  date: string | Date
): string {
  const dateString = date instanceof Date ? date.toISOString() : date;
  const hash = createHashFn("md5")
    .update(title + url + location + dateString)
    .digest("hex");

  return hash;
}
