import { beforeEach, describe, expect, mock, test } from "bun:test";
import { clearLogos, loadLogo, logoIsStale, readLogo } from "./logos";

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

beforeEach(() => {
  clearLogos();
});

describe("loadLogo", () => {
  test("keeps the first tier that serves an image, and how it is shaped", async () => {
    respondWith((url) => (url.includes("theme/light") ? missing() : image()));

    await loadLogo("symbol", "netflix.com");

    const entry = readLogo("symbol", "netflix.com");
    expect(entry?.uri).toStartWith("data:image/webp;base64,");
    // The tier that answered was `symbol`, which is a bare mark — the avatar
    // insets a mark and a plate differently, so this must survive the cache.
    expect(entry?.plate).toBe(false);
    expect(requested).toHaveLength(2);
  });

  test("does not walk the ladder again for a brand it already has", async () => {
    respondWith(() => image());
    await loadLogo("symbol", "spotify.com");
    const first = requested.length;

    // A second sighting a day later: cached, fresh, and worth no request.
    const entry = readLogo("symbol", "spotify.com");
    expect(entry).not.toBeNull();
    expect(entry && logoIsStale(entry, Date.now() + 24 * 60 * 60 * 1000)).toBe(
      false,
    );
    expect(requested).toHaveLength(first);
  });

  test("refreshes a logo a week after it was stored, not before", async () => {
    respondWith(() => image());
    await loadLogo("symbol", "github.com");
    const entry = readLogo("symbol", "github.com");
    if (!entry) throw new Error("expected a cached logo");

    const day = 24 * 60 * 60 * 1000;
    expect(logoIsStale(entry, entry.at + 6 * day)).toBe(false);
    expect(logoIsStale(entry, entry.at + 8 * day)).toBe(true);
  });

  test("caches a brand with no logo, and retries it hours later", async () => {
    respondWith(() => missing());

    await loadLogo("symbol", "nowhere.example");

    const entry = readLogo("symbol", "nowhere.example");
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

    await loadLogo("symbol", "gated.example");

    // Brandfetch serves 380 KB of HTML to a User-Agent it does not like. Stored
    // as a logo it would draw nothing and hold the entry for a week.
    expect(readLogo("symbol", "gated.example")?.uri).toBeNull();
  });

  test("writes nothing when the walk fails on the network", async () => {
    respondWith(() => {
      throw new Error("offline");
    });

    expect(await loadLogo("symbol", "offline.example")).toBeNull();
    // A flight must not pin the brand to the letter tile for six hours after
    // landing, so a throw is never recorded as "this brand has no logo".
    expect(readLogo("symbol", "offline.example")).toBeNull();
  });

  test("asks for the opaque square, on its own entry, for the banner", async () => {
    respondWith(() => image());

    await loadLogo("plate", "openai.com");

    expect(requested).toHaveLength(1);
    expect(requested[0]).toInclude("/icon/");
    expect(readLogo("plate", "openai.com")?.plate).toBe(true);
    // The avatar's ladder prefers a bare symbol, so the two must not collide.
    expect(readLogo("symbol", "openai.com")).toBeNull();
  });
});
