import { z } from "zod";

export const userRoleSchema = z.enum(["viewer", "analyst", "admin"]);
export const userStatusSchema = z.enum(["active", "inactive"]);

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(6).max(72),
  role: userRoleSchema.default("viewer"),
  status: userStatusSchema.default("active")
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z.string().email().transform((value) => value.toLowerCase().trim()).optional(),
    password: z.string().min(6).max(72).optional(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });
