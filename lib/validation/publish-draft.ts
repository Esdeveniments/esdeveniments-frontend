import { z } from "zod";
import { EventFormSchema } from "types/event";
import type { PublishDraftOwner } from "types/publish-draft";
import {
  MAX_TOTAL_UPLOAD_BYTES,
  PUBLISH_DRAFT_MAX_FORM_BYTES,
  PUBLISH_DRAFT_VERSION,
} from "@utils/constants";
import { isBackendImageType } from "@utils/image-validation";

export const PublishDraftOwnerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("guest") }),
  z.object({
    kind: z.literal("account"),
    accountId: z.string().min(1).max(256),
  }),
]);

// Drafts preserve unfinished input, not publication validity or edit-event IDs.
export const PublishDraftFormSchema = EventFormSchema.omit({ id: true })
  .extend({
    title: z.string(),
    description: z.string(),
    location: z.string(),
    url: z.string(),
    email: z.string().optional(),
  })
  .partial()
  .refine(
    (form) =>
      new TextEncoder().encode(JSON.stringify(form)).byteLength <=
      PUBLISH_DRAFT_MAX_FORM_BYTES,
    { message: "Draft form exceeds storage limit", params: { reason: "too-large" } },
  );

export const PublishDraftRevisionSchema = z.string().uuid().nullable();

export const PublishDraftMetadataSchema = z.object({
  version: z.literal(PUBLISH_DRAFT_VERSION),
  revision: z.string().uuid(),
});

export const PublishDraftRecordSchema = z.object({
  version: z.literal(PUBLISH_DRAFT_VERSION),
  owner: PublishDraftOwnerSchema,
  revision: z.string().uuid(),
  updatedAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  form: PublishDraftFormSchema,
  image: z
    .object({
      bytes: z.instanceof(ArrayBuffer),
      name: z.string().max(1024),
      type: z.string().refine(isBackendImageType),
      lastModified: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      size: z.number().int().nonnegative().max(MAX_TOTAL_UPLOAD_BYTES),
    })
    .refine((image) => image.size === image.bytes.byteLength)
    .nullable(),
});

export const getPublishDraftOwnerKey = (
  owner: PublishDraftOwner,
): string => (owner.kind === "guest" ? "guest" : `account:${owner.accountId}`);
