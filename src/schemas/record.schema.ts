import { z } from "zod";

export const recordTypeSchema = z.enum(["income", "expense"]);
export const recordStatusSchema = z.enum(["active", "reverted", "reversal"]);

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const booleanFromQuery = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return value;
}, z.boolean());

export const createRecordSchema = z.object({
  amount: z.coerce.number().positive(),
  type: recordTypeSchema,
  category: z.string().trim().min(1).max(60),
  entryDate: z.string().regex(dateRegex, "entryDate must be in YYYY-MM-DD format"),
  notes: z.string().trim().max(500).optional()
});

export const updateRecordSchema = z
  .object({
    amount: z.coerce.number().positive().optional(),
    type: recordTypeSchema.optional(),
    category: z.string().trim().min(1).max(60).optional(),
    entryDate: z.string().regex(dateRegex, "entryDate must be in YYYY-MM-DD format").optional(),
    notes: z.string().trim().max(500).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const revertRecordSchema = z.object({
  reason: z.string().trim().min(3).max(250).optional()
});

export const listRecordsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    type: recordTypeSchema.optional(),
    category: z.string().trim().min(1).max(60).optional(),
    status: recordStatusSchema.optional(),
    dateFrom: z.string().regex(dateRegex, "dateFrom must be in YYYY-MM-DD format").optional(),
    dateTo: z.string().regex(dateRegex, "dateTo must be in YYYY-MM-DD format").optional(),
    includeDeleted: booleanFromQuery.optional().default(false)
  })
  .refine((value) => !(value.dateFrom && value.dateTo) || value.dateFrom <= value.dateTo, {
    message: "dateFrom must be before or equal to dateTo",
    path: ["dateFrom"]
  });
