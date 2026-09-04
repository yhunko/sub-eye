import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
  clearLogos,
  loadLogo,
  logoFill,
  logoIsStale,
  previewVariant,
  readLogo,
  readStoredVariants,
  storeVariant,
} from "./logos";

/**
 * Stands in for RN's native `FileReader`, which Bun has no equivalent of. The
 * shape is what `toDataUri` uses and the output is the same string RN's
 * `RCTFileReaderModule` builds: `data:<type>;base64,<bytes>`.
 */
class FileReaderStub {
  result: string | null = null;
  error: unknown = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(blob: Blob): void {
    void blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onload?.();
    });
  }
}
(globalThis as { FileReader?: unknown }).FileReader = FileReaderStub;

const image = () =>
  new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: { "content-type": "image/webp" },
  });

const missing = () =>
  new Response(null, {
    status: 404,
    headers: { "content-type": "application/json" },
  });

/** Brandfetch's answer to a User-Agent it does not like: 200, and HTML. */
const wordmarkPage = () =>
  new Response("<html>…</html>", {
    status: 200,
    headers: { "content-type": "text/html" },
  });

let requested: string[] = [];

const respondWith = (reply: (url: string) => Response | Promise<Response>) => {
  requested = [];
  globalThis.fetch = mock(async (input: unknown) => {
    const url = String(input);
    requested.push(url);
    return await reply(url);
  }) as unknown as typeof fetch;
};

/** What `Image.getSize` reports next. See the stub in test-preload.ts. */
const measuresAs = (width: number, height: number) => {
  (globalThis as { __logoSize?: [number, number] }).__logoSize = [
    width,
    height,
  ];
};

beforeEach(() => {
  clearLogos();
  (globalThis as { __logoSize?: [number, number] }).__logoSize = undefined;
});

describe("loadLogo", () => {
  test("asks the square icon tier first, and stops there", async () => {
    respondWith(() => image());
    measuresAs(400, 400);

    await loadLogo("symbol", "netflix.com", null);

    // `icon` leads the ladder, so a brand that has one costs ONE request and
    // gets the full-colour square rather than a monochrome symbol inset to √½.
    expect(requested).toHaveLength(1);
    expect(requested[0]).toInclude("/icon/");
    const entry = readLogo("symbol", "netflix.com", null);
    expect(entry?.uri).toStartWith("data:image/webp;base64,");
    expect(entry?.plate).toBe(true);
  });

  test("falls back to the symbol tiers for a brand icon does not cover", async () => {
    respondWith((url) => (url.includes("/icon/") ? missing() : image()));

    await loadLogo("symbol", "netflix.com", null);

    expect(requested).toHaveLength(2);
    expect(requested[1]).toInclude("symbol/theme/light");
    // A bare mark, and the avatar insets one differently from a plate, so which
    // tier answered has to survive the cache.
    expect(readLogo("symbol", "netflix.com", null)?.plate).toBe(false);
  });

  test("records the shape of the image, not the shape of the request", async () => {
    respondWith(() => image());
    // Brandfetch's `w`/`h` are a bounding box: icloud.com's `icon` comes back
    // 512x333 from the same square request that gives Netflix 400x400. Storing
    // the request's shape is what drew that cloud at 60% of the circle.
    measuresAs(512, 333);

    await loadLogo("symbol", "icloud.com", null);

    expect(readLogo("symbol", "icloud.com", null)?.aspect).toBeCloseTo(
      1.538,
      3,
    );
  });

  test("does not walk the ladder again for a brand it already has", async () => {
    respondWith(() => image());
    await loadLogo("symbol", "spotify.com", null);
    const first = requested.length;

    // A second sighting a day later: cached, fresh, and worth no request.
    const entry = readLogo("symbol", "spotify.com", null);
    expect(entry).not.toBeNull();
    expect(entry && logoIsStale(entry, Date.now() + 24 * 60 * 60 * 1000)).toBe(
      false,
    );
    expect(requested).toHaveLength(first);
  });

  test("refreshes a logo a week after it was stored, not before", async () => {
    respondWith(() => image());
    await loadLogo("symbol", "github.com", null);
    const entry = readLogo("symbol", "github.com", null);
    if (!entry) throw new Error("expected a cached logo");

    const day = 24 * 60 * 60 * 1000;
    expect(logoIsStale(entry, entry.at + 6 * day)).toBe(false);
    expect(logoIsStale(entry, entry.at + 8 * day)).toBe(true);
  });

  test("caches a brand with no logo, and retries it hours later", async () => {
    respondWith(() => missing());

    await loadLogo("symbol", "nowhere.example", null);

    const entry = readLogo("symbol", "nowhere.example", null);
    // Cached as an ANSWER: without it every mount spends three 404s.
    expect(entry?.uri).toBeNull();
    expect(requested).toHaveLength(3);
    // Much shorter than a hit — a light symbol added tomorrow should show up.
    const hour = 60 * 60 * 1000;
    expect(logoIsStale(entry as never, (entry?.at ?? 0) + 5 * hour)).toBe(
      false,
    );
    expect(logoIsStale(entry as never, (entry?.at ?? 0) + 7 * hour)).toBe(true);
  });

  test("never stores a 200 that is not an image", async () => {
    respondWith(() => wordmarkPage());

    await loadLogo("symbol", "gated.example", null);

    // Brandfetch serves 380 KB of HTML to a User-Agent it does not like. Stored
    // as a logo it would draw nothing and hold the entry for a week.
    expect(readLogo("symbol", "gated.example", null)?.uri).toBeNull();
  });

  test("writes nothing when the walk fails on the network", async () => {
    respondWith(() => {
      throw new Error("offline");
    });

    expect(await loadLogo("symbol", "offline.example", null)).toBeNull();
    // A flight must not pin the brand to the letter tile for six hours after
    // landing, so a throw is never recorded as "this brand has no logo".
    expect(readLogo("symbol", "offline.example", null)).toBeNull();
  });

  test("asks for the opaque square, on its own entry, for the banner", async () => {
    respondWith(() => image());

    await loadLogo("plate", "openai.com", null);

    expect(requested).toHaveLength(1);
    expect(requested[0]).toInclude("/icon/");
    expect(readLogo("plate", "openai.com", null)?.plate).toBe(true);
    // Both kinds now lead with `icon`, but the banner blurs its copy and so
    // fetches a far larger source. Sharing one entry would either starve the
    // blur or make every row carry a 768 px image.
    expect(requested[0]).toInclude("/768/");
    expect(readLogo("symbol", "openai.com", null)).toBeNull();
  });
});

describe("logoFill", () => {
  test("fills the circle with a square plate, corners and all", () => {
    // The point of leading with `icon`: an app icon is meant to BE the avatar.
    // It cannot be inset — the plate is an opaque JPEG, so any margin paints
    // its own background as a ring, which on Spotify's green disc was white.
    expect(logoFill({ plate: true, aspect: 1 })).toBe(1);
    // A 400x400 source a resize returned as 400x399 is still a square plate.
    expect(logoFill({ plate: true, aspect: 400 / 399 })).toBe(1);
  });

  test("insets a plate that is not square, by how wide it actually is", () => {
    // icloud.com: the `icon` tier answers, but with a transparent 512x333 cloud
    // rather than a square. Filling with that crops the cloud away to a flat
    // blue disc; treating it as the square it is not drew it at 60% of the
    // circle. Measured, it asks for 0.84.
    const fill = logoFill({ plate: true, aspect: 512 / 333 });
    expect(fill).toBeCloseTo(0.838, 3);
    // The box's DIAGONAL is the diameter, so the mark reaches the edge, no more.
    expect(Math.hypot(fill, fill / (512 / 333))).toBeCloseTo(1, 6);
  });

  test("insets a bare mark to the inscribed square, whichever way it is long", () => {
    expect(logoFill({ plate: false, aspect: 1 })).toBeCloseTo(Math.SQRT1_2, 6);
    // Netflix's symbol is 282x512 — taller than wide. The inset is the same
    // either way round, which is what stopped the circle slicing the flat top
    // and bottom off its N.
    expect(logoFill({ plate: false, aspect: 282 / 512 })).toBeCloseTo(
      logoFill({ plate: false, aspect: 512 / 282 }),
      6,
    );
  });
});

describe("logo variants", () => {
  test("puts the chosen variant ahead of the automatic ladder", async () => {
    respondWith(() => image());

    await loadLogo("symbol", "notion.so", "symbol");

    // The user asked for the bare mark, so that is what is fetched — and the
    // theme-pinned one first, because unpinned symbols come back in whatever
    // theme the brand stored.
    expect(requested).toHaveLength(1);
    expect(requested[0]).toInclude("symbol/theme/light");
    expect(readLogo("symbol", "notion.so", "symbol")?.plate).toBe(false);
  });

  test("falls back past a chosen variant the brand no longer has", async () => {
    respondWith((url) => (url.includes("/symbol") ? missing() : image()));

    await loadLogo("symbol", "kyivstar.ua", "symbol");

    // A brand that drops its symbol must land on a logo, not on a letter tile.
    expect(readLogo("symbol", "kyivstar.ua", "symbol")?.uri).toStartWith(
      "data:image/",
    );
    expect(requested.at(-1)).toInclude("/icon/");
  });

  test("keeps a switched-away variant cached rather than evicting it", async () => {
    respondWith(() => image());
    await loadLogo("symbol", "figma.com", null);
    const auto = requested.length;

    await loadLogo("symbol", "figma.com", "logo");

    // Both entries stand, so flipping between two marks costs no network.
    expect(requested.length).toBeGreaterThan(auto);
    expect(readLogo("symbol", "figma.com", null)?.uri).toStartWith("data:");
    expect(readLogo("symbol", "figma.com", "logo")?.uri).toStartWith("data:");
  });

  test("previews one variant only, and admits when a brand has none", async () => {
    respondWith((url) => (url.includes("/symbol") ? missing() : image()));

    // Crucially NOT the icon: a tile that silently drew a different mark would
    // offer the user a choice that does nothing.
    expect(await previewVariant("icloud.com", "symbol")).toBeNull();
    expect(requested.every((url) => url.includes("/symbol"))).toBe(true);
    expect((await previewVariant("icloud.com", "icon"))?.uri).toStartWith(
      "data:image/",
    );
  });

  test("forgets chosen variants when the user erases their data", () => {
    storeVariant("notion.so", "logo");
    expect(readStoredVariants()["notion.so"]).toBe("logo");

    clearLogos();

    // The domains a user hand-picked a mark for name the brands they pay for,
    // same as the cache keys next door.
    expect(readStoredVariants()).toEqual({});
  });
});
