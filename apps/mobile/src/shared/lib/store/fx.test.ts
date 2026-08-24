import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { fxDocumentUrl, fxVersionCandidates } from "@subeye/money";
import { __testing, cachedRateDate, ratesPort, refreshRates } from "./fx";

const NOW = new Date("2026-08-24T09:00:00.000Z");

const realFetch = globalThis.fetch;

beforeEach(() => __testing.clearCache());
afterEach(() => {
  globalThis.fetch = realFetch;
  // bun runs every test file in one process and the react-native-mmkv preload
  // stub shares a single map across instance ids, so a cache left behind here
  // is visible to the next file.
  __testing.clearCache();
});

/** Records every request and answers each candidate from `bodies`, in order. */
const stubFetch = (bodies: unknown[]): { urls: string[] } => {
  const urls: string[] = [];
  let call = 0;

  globalThis.fetch = ((input: unknown) => {
    urls.push(String(input));
    const body = bodies[call++];

    if (body instanceof Error) return Promise.reject(body);
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }) as typeof fetch;

  return { urls };
};

const document = (date: string, uah: number) => ({
  date,
  usd: { usd: 1, uah, eur: 0.85 },
});

describe("ratesPort.forBase", () => {
  // A fresh install in airplane mode must still convert. Rates weeks stale beat
  // no conversion, and an empty table degrades every amount to 1:1 silently.
  it("derives from the bundled seed when nothing is cached", async () => {
    const rates = await ratesPort.forBase("uah");

    expect(rates.uah).toBe(1);
    expect(rates.usd).toBeGreaterThan(0);
    expect(Object.keys(rates).length).toBeGreaterThan(100);
  });

  // The request path must never wait on a CDN — the rule the server's getRates
  // followed, and the reason the daily refresh exists at all.
  it("never fetches", async () => {
    const { urls } = stubFetch([]);

    await ratesPort.forBase("uah");
    await ratesPort.forBase("eur");

    expect(urls).toEqual([]);
  });

  it("returns the fetched rates once a refresh has landed", async () => {
    stubFetch([document("2026-08-24", 50)]);
    await refreshRates(NOW);

    const rates = await ratesPort.forBase("uah");

    expect(rates.usd).toBeCloseTo(1 / 50, 10);
  });

  // deriveRatesFor answers {} for a code it has no rate for; convert then leaves
  // the amount alone rather than inventing a number.
  it("answers an empty table for an unknown code rather than throwing", async () => {
    expect(await ratesPort.forBase("zzz")).toEqual({});
  });
});

describe("refreshRates", () => {
  it("caches today's document and reports success", async () => {
    const { urls } = stubFetch([document("2026-08-24", 50)]);

    expect(await refreshRates(NOW)).toBe(true);
    expect(urls).toEqual([
      fxDocumentUrl(fxVersionCandidates(NOW)[0] as string),
    ]);
  });

  // The publisher's immutable build can lag the UTC date, so today's tag can
  // 404 while yesterday's is live.
  it("walks today, yesterday, then latest", async () => {
    const { urls } = stubFetch([
      new Error("404"),
      new Error("404"),
      document("2026-08-22", 50),
    ]);

    expect(await refreshRates(NOW)).toBe(true);
    expect(urls).toEqual(fxVersionCandidates(NOW).map(fxDocumentUrl));
  });

  // A 200 carrying the wrong shape is not a usable document; it has to fall
  // through to the next candidate rather than caching junk.
  it("skips a document with no usd key", async () => {
    const { urls } = stubFetch([
      { date: "2026-08-24" },
      document("2026-08-24", 50),
    ]);

    expect(await refreshRates(NOW)).toBe(true);
    expect(urls).toHaveLength(2);
    expect((await ratesPort.forBase("uah")).usd).toBeCloseTo(1 / 50, 10);
  });

  // Offline is the normal case, not an error case: the previous cache stays and
  // the caller is told nothing changed.
  it("returns false and keeps the previous cache when every candidate fails", async () => {
    stubFetch([document("2026-08-23", 50)]);
    await refreshRates(new Date("2026-08-23T09:00:00.000Z"));

    stubFetch([
      new Error("offline"),
      new Error("offline"),
      new Error("offline"),
    ]);

    expect(await refreshRates(NOW)).toBe(false);
    expect((await ratesPort.forBase("uah")).usd).toBeCloseTo(1 / 50, 10);
  });

  // The CDN build is immutable per day, so a second fetch cannot change the
  // answer — and a background task that runs on every foreground must not
  // hammer it.
  it("is a no-op returning true when the cache is already today's", async () => {
    stubFetch([document("2026-08-24", 50)]);
    await refreshRates(NOW);

    const { urls } = stubFetch([document("2026-08-24", 99)]);

    expect(await refreshRates(new Date("2026-08-24T23:59:00.000Z"))).toBe(true);
    expect(urls).toEqual([]);
  });

  // What the foreground sync in (tabs)/_layout keys its invalidation on. It has
  // to move for a fetch that landed and hold still for a no-op, or the money
  // screens either never repaint at the new rates or repaint at every
  // foreground for nothing.
  it("moves the cached rate date only when a fetch actually lands", async () => {
    expect(cachedRateDate()).toBeNull();

    stubFetch([document("2026-08-24", 50)]);
    await refreshRates(NOW);
    expect(cachedRateDate()).toBe("2026-08-24");

    stubFetch([document("2026-08-24", 99)]);
    await refreshRates(new Date("2026-08-24T23:59:00.000Z"));
    expect(cachedRateDate()).toBe("2026-08-24");

    stubFetch([document("2026-08-25", 99)]);
    await refreshRates(new Date("2026-08-25T09:00:00.000Z"));
    expect(cachedRateDate()).toBe("2026-08-25");
  });

  // Offline must not look like a new build, or every foreground with no network
  // would repaint the money screens.
  it("leaves the cached rate date alone when every candidate fails", async () => {
    stubFetch([document("2026-08-23", 50)]);
    await refreshRates(new Date("2026-08-23T09:00:00.000Z"));

    stubFetch([
      new Error("offline"),
      new Error("offline"),
      new Error("offline"),
    ]);
    await refreshRates(NOW);

    expect(cachedRateDate()).toBe("2026-08-23");
  });

  it("refetches once the UTC day has rolled over", async () => {
    stubFetch([document("2026-08-23", 50)]);
    await refreshRates(new Date("2026-08-23T09:00:00.000Z"));

    const { urls } = stubFetch([document("2026-08-24", 99)]);

    expect(await refreshRates(NOW)).toBe(true);
    expect(urls).toHaveLength(1);
    expect((await ratesPort.forBase("uah")).usd).toBeCloseTo(1 / 99, 10);
  });
});
