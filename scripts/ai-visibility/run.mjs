#!/usr/bin/env node
// Asks an AI assistant with web search the local questions in prompts.json and
// records which sites it cites. The admin dashboard reads the JSON artifact to
// track how often esdeveniments.cat is cited versus other sites.
//
// Usage: OPENROUTER_API_KEY=... node scripts/ai-visibility/run.mjs [out.json]
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.AI_VISIBILITY_MODEL || "openai/gpt-6.1-terra";
const CONCURRENCY = 5;
const TIMEOUT_MS = 120_000;

/** Unique cited URLs: web search annotations first, then markdown links in the text. */
export function citationsOf(message) {
  const urls = (message?.annotations ?? [])
    .filter((a) => a?.type === "url_citation" && a.url_citation?.url)
    .map((a) => a.url_citation.url);
  for (const [, url] of (message?.content ?? "").matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
    urls.push(url);
  }
  return [...new Set(urls.map(cleanUrl).filter(Boolean))];
}

/** Drops tracking params such as OpenAI's utm_source=openai so the same page counts once. */
function cleanUrl(raw) {
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function ask(prompt, key, date) {
  const res = await fetch(API_URL, {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://www.esdeveniments.cat",
      "X-Title": "esdeveniments.cat AI visibility",
    },
    body: JSON.stringify({
      model: MODEL,
      plugins: [{ id: "web", engine: "native" }],
      messages: [
        { role: "system", content: `Today is ${date}. Answer in the language of the question.` },
        { role: "user", content: prompt },
      ],
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body?.error?.message ?? "no body"}`);
  const message = body?.choices?.[0]?.message;
  if (!message) throw new Error("No message in the response");
  return { answer: message.content ?? "", citations: citationsOf(message) };
}

async function run(item, key, date) {
  for (let attempt = 1; ; attempt++) {
    try {
      return { ...item, ...(await ask(item.prompt, key, date)) };
    } catch (error) {
      if (attempt === 2) return { ...item, citations: [], error: String(error.message ?? error) };
    }
  }
}

async function main() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  const out = process.argv[2] || "ai-visibility.json";
  const prompts = JSON.parse(await readFile(new URL("./prompts.json", import.meta.url), "utf8"));
  const date = new Date().toISOString().slice(0, 10);

  const results = new Array(prompts.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < prompts.length) {
        const i = next++;
        results[i] = await run(prompts[i], key, date);
      }
    }),
  );

  const failed = results.filter((r) => r.error);
  const cited = results.filter((r) => r.citations.some((u) => u.includes("esdeveniments.cat")));
  await writeFile(
    out,
    JSON.stringify({ meta: { run_date: date, model: MODEL, prompts: prompts.length }, results }, null, 2),
  );
  console.log(
    `${results.length} prompts, ${failed.length} failed, esdeveniments.cat cited in ${cited.length}. Wrote ${out}`,
  );
  for (const r of failed) console.error(`Failed: ${r.prompt}: ${r.error}`);
  if (failed.length === results.length) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
