import { z } from "zod";

export const IntakeCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  saltGrams: z.number().nonnegative().max(100),
  note: z.string().max(500).optional().nullable(),
  source: z.enum(["MANUAL", "OCR"]).default("MANUAL"),
  ocrRawText: z.string().max(4000).optional().nullable(),
  consumedAt: z.coerce.date().optional(),
  isDraft: z.boolean().optional(),
});

export const IntakeUpdateSchema = IntakeCreateSchema.partial();

export type IntakeCreateInput = z.infer<typeof IntakeCreateSchema>;
export type IntakeUpdateInput = z.infer<typeof IntakeUpdateSchema>;
