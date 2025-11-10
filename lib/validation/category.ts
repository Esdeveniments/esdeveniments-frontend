import { z } from "zod";
import type {
  CategorySummaryResponseDTO,
  CategoryDetailResponseDTO,
} from "types/api/category";
import {
  EventSummaryResponseDTOSchema,
  CategorySummaryResponseDTOSchema,
} from "./event";

// Events in category details use the standard event summary schema
const CategoryEventSchema = EventSummaryResponseDTOSchema;

export const CategorySummaryArraySchema = z.array(
  CategorySummaryResponseDTOSchema
);

export const CategoryDetailResponseDTOSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    events: z.array(CategoryEventSchema),
  })
  .passthrough();

export function parseCategories(input: unknown): CategorySummaryResponseDTO[] {
  const result = CategorySummaryArraySchema.safeParse(input);
  if (!result.success) {
    console.error(
      "parseCategories: invalid categories payload",
      result.error.format()
    );
    return [];
  }
  return result.data;
}

export function parseCategoryDetail(
  input: unknown
): CategoryDetailResponseDTO | null {
  const result = CategoryDetailResponseDTOSchema.safeParse(input);
  if (!result.success) {
    console.error(
      "parseCategoryDetail: invalid category payload",
      result.error.format()
    );
    return null;
  }
  // Type assertion needed due to passthrough() allowing extra fields
  // that may not match the exact TypeScript type
  return result.data as CategoryDetailResponseDTO;
}
