"use client";

import ClientImage from "@components/ui/common/image/ClientImage";
import { useLocale, useTranslations } from "next-intl";
import type { EventDetailResponseDTO } from "types/api/event";

const formatDate = (value: string, locale: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatTimeRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "";
  const safeStart = start ?? "";
  const safeEnd = end ?? "";
  if (safeStart && safeEnd && safeStart === safeEnd) return safeStart;
  if (safeStart && safeEnd) return `${safeStart} · ${safeEnd}`;
  return safeStart || safeEnd;
};

export const PreviewContent = ({
  event,
}: {
  event: EventDetailResponseDTO;
}) => {
  const tForm = useTranslations("Components.EventForm");
  const locale = useLocale();
  const hasKey = (key: string) =>
    typeof (tForm as any).has === "function"
      ? (tForm as any).has(key)
      : Boolean((tForm as any).raw?.(key));

  const dateLabel = formatDate(event.startDate, locale);
  const dateEndLabel =
    event.endDate && event.endDate !== event.startDate
      ? formatDate(event.endDate, locale)
      : "";
  const timeLabel = formatTimeRange(event.startTime, event.endTime);
  const hasUrl = Boolean(event.url);
  const hasDescription = Boolean(event.description?.trim());

  const softWarnings: string[] = [];
  if (!hasUrl && hasKey("previewMissingUrl")) {
    softWarnings.push(tForm("previewMissingUrl"));
  }
  if (!hasDescription && hasKey("previewMissingDescription")) {
    softWarnings.push(tForm("previewMissingDescription"));
  }

  return (
    <div className="flex flex-col gap-element-gap py-3">
      <div className="w-full rounded-card overflow-hidden bg-muted">
        {event.imageUrl ? (
          <ClientImage
            image={event.imageUrl}
            title={event.title}
            className="w-full h-60"
            context="detail"
          />
        ) : (
          <div className="w-full h-60 flex-center text-foreground/60">
            {hasKey("imageLabel") ? tForm("imageLabel") : "Imatge"}
          </div>
        )}
      </div>

      <div className="stack">
        <div className="flex flex-col gap-1">
          <p className="label text-foreground/70">
            {hasKey("reviewTitle")
              ? tForm("reviewTitle")
              : "Abans de publicar"}
          </p>
          <h2 className="heading-2">{event.title}</h2>
        </div>

        <div className="card-bordered card-body space-y-element-gap">
          <div className="space-y-1">
            <p className="body-normal text-foreground-strong/80">
              {dateLabel}
              {dateEndLabel ? ` · ${dateEndLabel}` : ""}
            </p>
            {timeLabel && (
              <p className="body-normal text-foreground/70">{timeLabel}</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="body-normal font-semibold text-foreground-strong">
              {hasKey("location") ? tForm("location") : "Ubicació"}
            </p>
            <p className="body-normal text-foreground/80">
              {event.location ||
                event.city?.name ||
                event.region?.name ||
                "—"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="body-normal font-semibold text-foreground-strong">
              {hasKey("categoriesPlaceholder")
                ? tForm("categoriesPlaceholder")
                : "Categories"}
            </p>
            {event.categories && event.categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {event.categories.map((category) => (
                  <span
                    key={category.slug || category.id}
                    className="badge-default"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="body-small text-foreground/70">
                {hasKey("previewMissingCategories")
                  ? tForm("previewMissingCategories")
                  : "Encara no has afegit categories"}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <p className="body-normal font-semibold text-foreground-strong">
              {hasKey("url") ? tForm("url") : "Enllaç"}
            </p>
            {hasUrl ? (
              <a
                className="body-normal text-primary hover:underline"
                href={event.url}
                target="_blank"
                rel="noreferrer"
              >
                {event.url}
              </a>
            ) : (
              <p className="body-small text-foreground/70">
                {hasKey("previewMissingUrl")
                  ? tForm("previewMissingUrl")
                  : "Afegeix un enllaç perquè la gent pugui veure'n més detalls."}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <p className="body-normal font-semibold text-foreground-strong">
              {hasKey("descriptionLabel")
                ? tForm("descriptionLabel")
                : "Descripció"}
            </p>
            {hasDescription ? (
              <p className="body-normal whitespace-pre-wrap text-foreground/80">
                {event.description}
              </p>
            ) : (
              <p className="body-small text-foreground/70">
                {hasKey("previewMissingDescription")
                  ? tForm("previewMissingDescription")
                  : "Afegeix una descripció perquè sigui més fàcil trobar-lo."}
              </p>
            )}
          </div>
        </div>

        {softWarnings.length > 0 && (
          <div className="card-bordered card-body space-y-2 bg-muted/50 border-dashed border-border">
            <p className="body-normal font-semibold text-foreground-strong">
              {hasKey("previewWarnings")
                ? tForm("previewWarnings")
                : "Recomanacions"}
            </p>
            <ul className="space-y-1">
              {softWarnings.map((warning) => (
                <li
                  key={warning}
                  className="body-small text-foreground/80 list-disc list-inside"
                >
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewContent;




