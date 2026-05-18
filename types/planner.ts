import { z } from "zod";
import { SUPPORTED_LOCALES } from "./i18n";
import type { EventSummaryResponseDTO } from "./api/event";

export const PlannerRequestSchema = z.object({
  query: z.string().trim().min(3).max(500),
  locale: z.enum(SUPPORTED_LOCALES).optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
    })
    .optional(),
});

export type PlannerRequest = z.infer<typeof PlannerRequestSchema>;

export interface PlannerEventCitation {
  slug: string;
  reason: string;
}

export interface PlannerResponse {
  ok: true;
  message: string;
  events: EventSummaryResponseDTO[];
  citations: PlannerEventCitation[];
  toolCalls: number;
  modelId: string;
}

export interface PlannerErrorResponse {
  ok: false;
  error:
    | "INVALID_BODY"
    | "RATE_LIMITED"
    | "LLM_UNAVAILABLE"
    | "NO_RESULTS"
    | "INTERNAL";
  message?: string;
}

export const SEARCH_EVENTS_TOOL_NAME = "search_events";

export const SearchEventsArgsSchema = z.object({
  term: z.string().trim().max(200).optional(),
  place: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  byDate: z
    .enum(["today", "week", "weekend", "month"])
    .optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  type: z.enum(["FREE", "PAID"]).optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export type SearchEventsArgs = z.infer<typeof SearchEventsArgsSchema>;

// --- Internal types shared by planner modules ---

export interface PlannerEventCompact {
  slug: string;
  title: string;
  startDate: string;
  startTime: string | null;
  city: string | null;
  region: string | null;
  categories: string[];
  type: "FREE" | "PAID";
  location: string;
}

export interface SearchEventsResult {
  events: PlannerEventCompact[];
  total: number;
  note?: string;
}

export interface RunPlannerArgs {
  query: string;
  locale: import("./i18n").AppLocale;
  today: string;
}

export interface RunPlannerError {
  ok: false;
  error: "LLM_UNAVAILABLE" | "NO_RESULTS" | "INTERNAL";
  message?: string;
}

export type RunPlannerResult = PlannerResponse | RunPlannerError;

export interface PlannerFormProps {
  locale: import("./i18n").AppLocale;
  placeholder: string;
  submitLabel: string;
  loadingLabel: string;
  emptyLabel: string;
  errorLabel: string;
  suggestionsLabel: string;
  suggestions: string[];
  resultsLabel: string;
  eventsLabel: string;
  noMatchesLabel: string;
  modelDisclaimer: string;
}

export type PlannerFormStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      message: string;
      events: import("./api/event").EventSummaryResponseDTO[];
      citations: PlannerEventCitation[];
      toolCalls: number;
      modelId: string;
    };

// --- GitHub Models / OpenAI-compatible chat completion shapes ---

export interface ChatToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ChatToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ChatCompletionToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ChatCompletionToolDefinition[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionChoice {
  index: number;
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: ChatToolCall[];
  };
  finish_reason: string | null;
}

export interface ChatCompletionResponse {
  id: string;
  choices: ChatCompletionChoice[];
}
