// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/shared/lib/db/model/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
