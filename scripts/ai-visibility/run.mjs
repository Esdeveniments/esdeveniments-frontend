#!/usr/bin/env node
// Asks an AI assistant with web search the local questions in prompts.json and
// records which sites it cites. The admin dashboard reads the JSON artifact to
// track how often esdeveniments.cat is cited versus other sites.
//
// The model picks the engine. By default it asks ChatGPT's model through
// OpenRouter with OpenAI's native web search (about $0.035 a question), since
// ChatGPT sends almost all of our AI assistant visits. A `gemini-*` model, such
// as gemini-3.5-flash-lite, uses the Gemini API with Google Search grounding
// instead; that needs a paid Gemini project (5,000 free searches a month).
//
// Usage: OPENROUTER_API_KEY=... node scripts/ai-visibility/run.mjs [out.json]
//        AI_VISIBILITY_MODEL=gemini-3.5-flash-lite GEMINI_API_KEY=... node scripts/ai-visibility/run.mjs
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const MODEL = process.env.AI_VISIBILITY_MODEL || "openai/gpt-6.1-terra";
const GEMINI = MODEL.startsWith("gemini");
// Low enough for Gemini's per-minute limits.
const CONCURRENCY = 2;
const ATTEMPTS = 3;
const TIMEOUT_MS = 120_000;
// No new question or retry after this, so the results are written well before
// the workflow's 30-minute timeout.
const DEADLINE = Date.now() + 20 * 60_000;

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

/** Real page URLs behind Gemini's grounding redirects; the source domain when a redirect can't be read. */
async function geminiCitations(chunks = []) {
  const urls = await Promise.all(
    chunks
      .map((chunk) => chunk.web)
      .filter((web) => web?.uri)
      .map(async ({ uri, title }) => {
        try {
          const res = await fetch(uri, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
          const location = res.headers.get("location");
          if (location) return location;
        } catch {
          // Fall back to the domain below.
        }
        return title ? `https://${title}/` : uri;
      }),
  );
  return [...new Set(urls.map(cleanUrl).filter(Boolean))];
}

/** Rate limits and server errors are worth retrying; a bad key or request isn't. */
function httpError(status, body) {
  const error = new Error(`HTTP ${status}: ${body?.error?.message ?? "no body"}`);
  error.retry = status === 429 || status >= 500;
  return error;
}

async function askGemini(prompt, system) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) throw httpError(res.status, body);
  const candidate = body?.candidates?.[0];
  if (!candidate) throw new Error("No candidate in the response");
  return {
    answer: (candidate.content?.parts ?? []).map((part) => part.text ?? "").join(""),
    citations: await geminiCitations(candidate.groundingMetadata?.groundingChunks),
  };
}

async function askOpenRouter(prompt, system) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://www.esdeveniments.cat",
      "X-Title": "esdeveniments.cat AI visibility",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      plugins: [{ id: "web", engine: "native" }],
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw httpError(res.status, body);
  const message = body?.choices?.[0]?.message;
  if (!message) throw new Error("No message in the response");
  return { answer: message.content ?? "", citations: citationsOf(message) };
}

async function run(item, date) {
  const system = `Today is ${date}. Answer in the language of the question.`;
  for (let attempt = 1; ; attempt++) {
    if (Date.now() > DEADLINE) return { ...item, citations: [], error: "Out of time" };
    try {
      return { ...item, ...(await (GEMINI ? askGemini : askOpenRouter)(item.prompt, system)) };
    } catch (error) {
      if (attempt === ATTEMPTS || error.retry === false) {
        return { ...item, citations: [], error: String(error.message ?? error) };
      }
      // Mostly rate limits: wait before trying again.
      await new Promise((resolve) => setTimeout(resolve, 20_000 * attempt));
    }
  }
}

async function main() {
  const keyName = GEMINI ? "GEMINI_API_KEY" : "OPENROUTER_API_KEY";
  if (!process.env[keyName]) throw new Error(`${keyName} is not set`);
  const out = process.argv[2] || "ai-visibility.json";
  const prompts = JSON.parse(await readFile(new URL("./prompts.json", import.meta.url), "utf8"));
  const date = new Date().toISOString().slice(0, 10);

  const results = new Array(prompts.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < prompts.length) {
        const i = next++;
        results[i] = await run(prompts[i], date);
        const { error, citations } = results[i];
        console.log(`${i + 1}/${prompts.length} ${prompts[i].place}: ${error ?? `${citations.length} citations`}`);
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
