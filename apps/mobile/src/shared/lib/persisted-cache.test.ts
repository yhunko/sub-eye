import { describe, expect, it } from "bun:test";
import { readPersistedCache } from "./persisted-cache";

const clientState = { mutations: [], queries: [] };
const NOW = 1_700_000_000_000;
const WEEK = 7 * 24 * 60 * 60 * 1000;
const options = { now: NOW, buster: "1.2.3-1", maxAge: WEEK };

const blob = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    timestamp: NOW - 1000,
    buster: "1.2.3-1",
    clientState,
    ...over,
  });

describe("readPersistedCache", () => {
  it("returns the client state for a fresh payload", () => {
    expect(readPersistedCache(blob(), options)).toEqual(clientState);
  });

  it("discards a payload written under a different buster", () => {
    // The buster carries PERSIST_SCHEMA. An OTA that changes a persisted DTO
    // shape bumps it, and rehydrating the old shape would feed the pricing and
    // spend screens fields that no longer mean what they used to.
    expect(readPersistedCache(blob({ buster: "1.2.3-0" }), options)).toBeNull();
  });

  it("discards a payload older than maxAge", () => {
    expect(
      readPersistedCache(blob({ timestamp: NOW - WEEK - 1 }), options),
    ).toBeNull();
    // Exactly at the boundary is still usable — matches TanStack's own `>`.
    expect(
      readPersistedCache(blob({ timestamp: NOW - WEEK }), options),
    ).toEqual(clientState);
  });

  it("discards a payload with no timestamp, since its age is unknowable", () => {
    expect(
      readPersistedCache(blob({ timestamp: undefined }), options),
    ).toBeNull();
  });

  it("returns null rather than throwing on absent or corrupt storage", () => {
    // A half-written blob must not take the whole app down on launch — this runs
    // at module load, before any error boundary exists.
    expect(readPersistedCache(null, options)).toBeNull();
    expect(readPersistedCache("", options)).toBeNull();
    expect(readPersistedCache("{not json", options)).toBeNull();
    expect(readPersistedCache("null", options)).toBeNull();
    expect(readPersistedCache('"a string"', options)).toBeNull();
  });
});
