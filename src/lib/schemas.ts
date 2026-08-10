import { z } from "zod";

export const STORAGE_LOCATIONS = [
  "fridge",
  "freezer",
  "pantry",
  "bathroom",
  "other",
] as const;

const emptyToUndefined = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? undefined : val;

export const saveItemSchema = z.object({
  barcode: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  name: z.string().trim().min(1, "Name is required"),
  brand: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  imageUrl: z.preprocess(
    emptyToUndefined,
    z.string().trim().url().optional()
  ),
  category: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  price: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).optional()
  ),
  expirationDate: z
    .string()
    .min(1, "Expiration date is required")
    .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid date"),
  quantity: z.coerce.number().int().min(1).default(1),
  location: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export type SaveItemInput = z.infer<typeof saveItemSchema>;

export const updateItemSchema = saveItemSchema.extend({
  id: z.string().min(1),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;
