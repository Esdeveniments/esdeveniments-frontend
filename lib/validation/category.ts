import { z } from "zod";
import type { CategorySummaryResponseDTO } from "types/api/category";

export const CategorySummaryResponseDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

export const CategorySummaryArraySchema = z.array(
  CategorySummaryResponseDTOSchema
);

export function parseCategories(input: unknown): CategorySummaryResponseDTO[] {
  const result = CategorySummaryArraySchema.safeParse(input);
  if (!result.success) {
    console.error("parseCategories: invalid categories payload", result.error);
    return [];
  }
  return result.data;
}


