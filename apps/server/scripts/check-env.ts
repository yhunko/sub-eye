#!/usr/bin/env bun
/**
 * Validates that all required server secrets are present in process.env.
 * Run this in CI before deploying to catch missing or empty secrets early.
 *
 * Usage: bun run check-env
 */
import * as v from "valibot";
import { BindingsSchema } from "../src/env";

const result = v.safeParse(BindingsSchema, process.env);

if (!result.success) {
  const flat = v.flatten(result.issues);
  console.error("Missing or invalid server environment variables:\n");
  for (const [key, messages] of Object.entries(flat.nested ?? {})) {
    console.error(`  ${key}: ${messages?.join(", ")}`);
  }
  process.exit(1);
}

console.log("Server environment variables OK.");
