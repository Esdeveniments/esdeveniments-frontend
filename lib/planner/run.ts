import { fetchEventBySlug } from "@lib/api/events-external";
import type { EventSummaryResponseDTO } from "types/api/event";
import { DEFAULT_LOCALE } from "types/i18n";
import type {
  PlannerEventCitation,
  RunPlannerArgs,
  RunPlannerResult,
} from "types/planner";
import { SEARCH_EVENTS_TOOL_NAME } from "types/planner";
import {
  chatCompletions,
  isPlannerConfigured,
  PLANNER_MODEL_ID,
  type ChatMessage,
} from "./client";
import {
  buildSystemPrompt,
  SEARCH_EVENTS_TOOL_DEFINITION,
} from "./prompts";
import { runSearchEvents } from "./tools";

const MAX_TOOL_ITERATIONS = 4;
const FETCH_CONCURRENCY = 5;
// Matches [slug-format] at end of bullets. Slugs are kebab-case with letters,
// digits, dashes and the occasional dot (e.g. "festa-major-2026.05").
const CITATION_REGEX = /\[([a-z0-9][a-z0-9.-]{1,200})\]/g;

function extractCitations(text: string): PlannerEventCitation[] {
  const seen = new Set<string>();
  const citations: PlannerEventCitation[] = [];
  for (const match of text.matchAll(CITATION_REGEX)) {
    const slug = match[1];
    if (seen.has(slug)) continue;
    seen.add(slug);
    citations.push({ slug, reason: "" });
  }
  return citations;
}

async function hydrateCitations(
  citations: PlannerEventCitation[],
): Promise<EventSummaryResponseDTO[]> {
  if (citations.length === 0) return [];
  const events: EventSummaryResponseDTO[] = [];
  for (let i = 0; i < citations.length; i += FETCH_CONCURRENCY) {
    const slice = citations.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(
      slice.map(async (citation) => {
        try {
          return await fetchEventBySlug(citation.slug);
        } catch {
          return null;
        }
      }),
    );
    for (const result of results) {
      if (result) events.push(result);
    }
  }
  return events;
}

export async function runPlanner(
  args: RunPlannerArgs,
): Promise<RunPlannerResult> {
  if (!isPlannerConfigured()) {
    return { ok: false, error: "LLM_UNAVAILABLE" };
  }

  const locale = args.locale ?? DEFAULT_LOCALE;
  const systemPrompt = buildSystemPrompt(locale, args.today);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: args.query },
  ];

  let toolCallsCount = 0;

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const completion = await chatCompletions({
      model: PLANNER_MODEL_ID,
      messages,
      tools: [SEARCH_EVENTS_TOOL_DEFINITION],
      temperature: 0.4,
      max_tokens: 800,
    });

    const choice = completion.choices[0];
    if (!choice) return { ok: false, error: "INTERNAL" };

    const assistantMessage = choice.message;
    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls ?? [];
    if (toolCalls.length === 0) {
      const text = assistantMessage.content ?? "";
      if (!text.trim()) return { ok: false, error: "NO_RESULTS" };

      const citations = extractCitations(text);
      const events = await hydrateCitations(citations);

      return {
        ok: true,
        message: text,
        events,
        citations,
        toolCalls: toolCallsCount,
        modelId: PLANNER_MODEL_ID,
      };
    }

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      if (call.function.name !== SEARCH_EVENTS_TOOL_NAME) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ error: "Unknown tool" }),
        });
        continue;
      }
      toolCallsCount += 1;
      let result;
      try {
        const parsedArgs = JSON.parse(call.function.arguments || "{}");
        result = await runSearchEvents(parsedArgs);
      } catch (err) {
        // Surface the parse error to the LLM so it can correct its output
        // on the next iteration instead of silently running an unfiltered search.
        result = {
          events: [],
          total: 0,
          note: `Invalid tool arguments: ${err instanceof Error ? err.message : "malformed JSON"}. Reissue the call with valid JSON.`,
        };
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return { ok: false, error: "NO_RESULTS" };
}
