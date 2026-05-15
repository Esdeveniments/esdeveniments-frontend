import { z } from "zod";
import type {
  EventFormZodLabels,
} from "types/event";
import { defaultEventFormZodLabels } from "types/event";

// Server-only zod schema for the event form.
// IMPORTANT: do not import this module from client components or from
// `types/event.ts`. Keeping it isolated here prevents zod from leaking into
// client bundles. Client-side validation lives in `utils/form-validation.ts`.

const OptionSchema = z.object({ value: z.string(), label: z.string() });

const RegionSummaryResponseDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

const CitySummaryResponseDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  postalCode: z.string(),
  rssFeed: z.string().nullable().optional(),
  enabled: z.boolean(),
});

const CategoryFormItemSchema = z.union([
  z.object({ id: z.number(), name: z.string() }),
  OptionSchema,
  z.number(),
]);

export const createEventFormSchema = (
  labels: EventFormZodLabels = defaultEventFormZodLabels,
) =>
  z.object({
    id: z.string().optional(),
    title: z.string().min(1, labels.titleRequired),
    description: z.string().min(1, labels.descriptionRequired),
    type: z.enum(["FREE", "PAID"]),
    startDate: z.string(),
    startTime: z.string().nullable(),
    endDate: z.string(),
    endTime: z.string().nullable(),
    region: z.union([RegionSummaryResponseDTOSchema, OptionSchema]).nullable(),
    town: z.union([CitySummaryResponseDTOSchema, OptionSchema]).nullable(),
    location: z.string().min(1, labels.locationRequired),
    imageUrl: z
      .url(labels.invalidUrl)
      .refine((val) => {
        if (!val) return true;
        try {
          const url = new URL(val);
          return url.hostname.includes(".");
        } catch {
          return false;
        }
      }, labels.invalidUrl)
      .nullable()
      .or(z.literal("")),
    url: z
      .string()
      .refine(
        (val) => !val || z.url().safeParse(val).success,
        labels.invalidUrl,
      ),
    categories: z.array(CategoryFormItemSchema),
    email: z.email(labels.invalidEmail).or(z.literal("")).optional(),
    isAllDay: z.boolean().optional(),
  });

export const EventFormSchema = createEventFormSchema();
