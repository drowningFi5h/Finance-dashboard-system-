import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { z } from "zod";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", ".env")
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("8h"),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().positive().default(8),
  IDLE_TIMEOUT_VIEWER_MINUTES: z.coerce.number().positive().default(20),
  IDLE_TIMEOUT_ANALYST_MINUTES: z.coerce.number().positive().default(20),
  IDLE_TIMEOUT_ADMIN_MINUTES: z.coerce.number().positive().default(60)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const missingOrInvalid = parsedEnv.error.issues.map((issue) => issue.path.join(".")).join(", ");

  throw new Error(
    `Invalid environment variables: ${missingOrInvalid}. ` +
      "Create server/.env from server/.env.example and set required values."
  );
}

export const env = parsedEnv.data;
