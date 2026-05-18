"use client";

import { useState, type FormEvent } from "react";
import { Link } from "@i18n/routing";
import type { EventSummaryResponseDTO } from "types/api/event";
import type {
  PlannerErrorResponse,
  PlannerFormProps,
  PlannerFormStatus,
  PlannerResponse,
} from "types/planner";

// Strip [slug] citations from the message body — we already render the cards.
const CITATION_REGEX = /\s*\[[a-z0-9][a-z0-9.-]{1,200}\]/g;

function renderMessage(message: string): string {
  return message.replace(CITATION_REGEX, "").trim();
}

export default function PlannerForm({
  locale,
  placeholder,
  submitLabel,
  loadingLabel,
  emptyLabel,
  errorLabel,
  suggestionsLabel,
  suggestions,
  resultsLabel,
  eventsLabel,
  noMatchesLabel,
  modelDisclaimer,
}: PlannerFormProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PlannerFormStatus>({ kind: "idle" });

  async function submit(currentQuery: string) {
    const trimmed = currentQuery.trim();
    if (trimmed.length < 3) {
      setStatus({ kind: "error", message: emptyLabel });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      // eslint-disable-next-line no-restricted-globals -- same-origin internal route, fetchWithHmac not applicable to client-side
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, locale }),
      });
      const json = (await res.json()) as PlannerResponse | PlannerErrorResponse;
      if (!json.ok) {
        setStatus({
          kind: "error",
          message: json.message ?? errorLabel,
        });
        return;
      }
      setStatus({
        kind: "ready",
        message: json.message,
        events: json.events,
        citations: json.citations,
        toolCalls: json.toolCalls,
        modelId: json.modelId,
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : errorLabel,
      });
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(query);
  }

  function onSuggestion(suggestion: string) {
    setQuery(suggestion);
    void submit(suggestion);
  }

  const isLoading = status.kind === "loading";

  return (
    <section aria-labelledby="planner-form-heading">
      <h2 id="planner-form-heading" className="sr-only">
        {submitLabel}
      </h2>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="planner-query" className="sr-only">
          {placeholder}
        </label>
        <input
          id="planner-query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={500}
          className="flex-1 rounded-button border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="rounded-button bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? loadingLabel : submitLabel}
        </button>
      </form>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {suggestionsLabel}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggestion(s)}
              className="rounded-badge border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {status.kind === "error" && (
        <div
          role="alert"
          className="mt-6 rounded-button border border-border bg-muted p-4 text-sm text-foreground"
        >
          {status.message}
        </div>
      )}

      {status.kind === "loading" && (
        <div className="mt-6 rounded-button border border-border bg-muted p-4 text-sm text-muted-foreground">
          {loadingLabel}
        </div>
      )}

      {status.kind === "ready" && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-foreground">
            {resultsLabel}
          </h3>
          <div className="mt-3 whitespace-pre-line rounded-button border border-border bg-muted p-4 text-base text-foreground">
            {renderMessage(status.message)}
          </div>

          {status.events.length > 0 ? (
            <div className="mt-6">
              <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {eventsLabel}
              </h4>
              <ul className="mt-3 space-y-3">
                {status.events.map((event) => (
                  <EventResultRow key={event.slug} event={event} />
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {noMatchesLabel}
            </p>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            {modelDisclaimer}
            {" · "}
            <code className="font-mono">{status.modelId}</code>
            {" · "}
            {status.toolCalls} tool calls
          </p>
        </div>
      )}
    </section>
  );
}

function EventResultRow({ event }: { event: EventSummaryResponseDTO }) {
  const subtitle = [event.city?.name, event.region?.name]
    .filter(Boolean)
    .join(" · ");
  const datePart = event.formattedStart ?? event.startDate;

  return (
    <li>
      <Link
        href={`/e/${event.slug}`}
        className="block rounded-button border border-border bg-background p-4 transition-colors hover:border-primary"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-foreground">
              {event.title}
            </p>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm text-muted-foreground">{datePart}</p>
            {event.type === "FREE" && (
              <p className="mt-1 text-xs font-medium text-primary">FREE</p>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
