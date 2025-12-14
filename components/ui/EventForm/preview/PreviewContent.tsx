"use client";

import ClientImage from "@components/ui/common/image/ClientImage";
import { useLocale, useTranslations } from "next-intl";
import type { EventDetailResponseDTO } from "types/api/event";
import {
  PhotographIcon,
  CalendarIcon,
  LocationMarkerIcon,
  TagIcon,
  ExternalLinkIcon,
  DocumentIcon,
  XCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/outline";

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

  // Check what's complete
  const hasImage = Boolean(event.imageUrl);
  const hasUrl = Boolean(event.url);
  const hasDescription = Boolean(event.description?.trim());
  const hasCategories = event.categories && event.categories.length > 0;

  // Required fields that are missing (blocking)
  const requiredMissing: string[] = [];
  if (!hasImage) {
    requiredMissing.push(hasKey("previewRequiredImage") ? tForm("previewRequiredImage") : "Falta la imatge");
  }

  // Soft warnings (recommendations, not blocking)
  const softWarnings: string[] = [];
  if (!hasUrl && hasKey("previewMissingUrl")) {
    softWarnings.push(tForm("previewMissingUrl"));
  }
  if (!hasDescription && hasKey("previewMissingDescription")) {
    softWarnings.push(tForm("previewMissingDescription"));
  }
  if (!hasCategories && hasKey("previewMissingCategories")) {
    softWarnings.push(tForm("previewMissingCategories"));
  }

  return (
    <div className="flex flex-col gap-element-gap py-3">
      {/* Image preview */}
      <div className={`w-full rounded-card overflow-hidden ${hasImage ? 'bg-muted' : 'bg-error/10 border-2 border-dashed border-error/50'}`}>
        {hasImage ? (
          <ClientImage
            image={event.imageUrl}
            title={event.title}
            className="w-full aspect-video object-cover"
            context="detail"
          />
        ) : (
          <div className="w-full h-48 flex-center flex-col gap-2 text-error/70">
            <PhotographIcon className="w-12 h-12" />
            <p className="body-normal font-medium">
              {hasKey("previewRequiredImage") ? tForm("previewRequiredImage") : "Falta la imatge"}
            </p>
          </div>
        )}
      </div>

      <div className="stack">
        {/* Event title section */}
        <div className="flex flex-col gap-1">
          <p className="label text-foreground/70">
            {hasKey("reviewTitle")
              ? tForm("reviewTitle")
              : "Abans de publicar"}
          </p>
          <h2 className="heading-2">{event.title || <span className="text-error/70">Sense títol</span>}</h2>
        </div>

        {/* Event details card */}
        <div className="card-bordered card-body space-y-element-gap">
          {/* Date & Time */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-foreground/70" />
              <p className="body-normal text-foreground-strong/80">
                {dateLabel}
                {dateEndLabel ? ` · ${dateEndLabel}` : ""}
              </p>
            </div>
            {timeLabel && (
              <p className="body-normal text-foreground/70 ml-6">{timeLabel}</p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <LocationMarkerIcon className="w-5 h-5 text-foreground/70" />
              <p className="body-normal font-medium text-foreground-strong">
                {event.location ||
                  event.city?.name ||
                  event.region?.name ||
                  "—"}
              </p>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TagIcon className="w-5 h-5 text-foreground/70" />
              <p className="body-normal font-medium text-foreground-strong">
                {hasKey("categoriesPlaceholder")
                  ? "Categories"
                  : "Categories"}
              </p>
            </div>
            {hasCategories ? (
              <div className="flex flex-wrap gap-2 ml-6">
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
              <p className="body-small text-foreground/50 ml-6 italic">
                Cap categoria seleccionada
              </p>
            )}
          </div>

          {/* URL */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ExternalLinkIcon className="w-5 h-5 text-foreground/70" />
              <p className="body-normal font-medium text-foreground-strong">
                Enllaç
              </p>
            </div>
            {hasUrl ? (
              <a
                className="body-normal text-primary hover:underline ml-6 break-all"
                href={event.url}
                target="_blank"
                rel="noreferrer"
              >
                {event.url}
              </a>
            ) : (
              <p className="body-small text-foreground/50 ml-6 italic">
                Opcional
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DocumentIcon className="w-5 h-5 text-foreground/70" />
              <p className="body-normal font-medium text-foreground-strong">
                Descripció
              </p>
            </div>
            {hasDescription ? (
              <p className="body-normal whitespace-pre-wrap text-foreground/80 ml-6 line-clamp-4">
                {event.description}
              </p>
            ) : (
              <p className="body-small text-foreground/50 ml-6 italic">
                Opcional
              </p>
            )}
          </div>
        </div>

        {/* Required items missing - RED warning box */}
        {requiredMissing.length > 0 && (
          <div className="card-body space-y-2 bg-error/10 border border-error/30 rounded-card">
            <p className="body-normal font-semibold text-error flex items-center gap-2">
              <XCircleIcon className="w-5 h-5" />
              {hasKey("previewRequired") ? tForm("previewRequired") : "Necessari"}
            </p>
            <ul className="space-y-1">
              {requiredMissing.map((item) => (
                <li
                  key={item}
                  className="body-small text-error/80 list-disc list-inside ml-2"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Soft recommendations - MUTED warning box */}
        {softWarnings.length > 0 && (
          <div className="card-body space-y-2 bg-warning/10 border border-warning/30 rounded-card">
            <p className="body-normal font-semibold text-warning-dark flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5" />
              {hasKey("previewWarnings")
                ? tForm("previewWarnings")
                : "Recomanacions"}
            </p>
            <ul className="space-y-1">
              {softWarnings.map((warning) => (
                <li
                  key={warning}
                  className="body-small text-foreground/80 list-disc list-inside ml-2"
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





