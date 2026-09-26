import { Image } from "react-native";
import { createMMKV } from "react-native-mmkv";
import { env } from "@/shared/config/env";

/**
 * The bytes of every brand mark the app has drawn, as data URIs on their own
 * MMKV instance.
 *
 * The app used to hand `Image` a remote URL and let the platform's HTTP cache
 * decide. That cache is a shared, evictable, best-effort thing — the CDN's own
 * `max-age` is 24h, and even a hit is an async trip through the networking
 * stack — so a cold start drew empty circles that filled in a beat later, every
 * launch. Owning the bytes is the only way to promise otherwise: an MMKV read
 * is synchronous, so a cached logo is in hand during the first render.
 *
 * Its own instance rather than a key in the store document: a subscription
 * write must not re-serialise a megabyte of logos. It IS derived from the
 * user's list — which brands they pay for — so unlike the FX table it is
 * cleared by "Erase all data".
 */
const mmkv = createMMKV({ id: "subeye.logos" });

/**
 * Which shape of image a call site needs.
 *
 * `symbol` is the avatar's ladder: a bare mark, preferred, falling back to a
 * plate. `plate` is the opaque square the detail banner blurs into a colour
 * wash — a transparent symbol blurs to almost nothing, so that screen must ask
 * for the plate specifically.
 */
export type LogoKind = "symbol" | "plate";

/**
 * Which of a brand's marks to draw, when the automatic pick is not the one the
 * user wants.
 *
 * Brandfetch stores three shapes per brand and no single one is right for every
 * brand: `icon` is the app icon and the default because it is the only tier
 * that answered for all 40 brands probed; `symbol` is the bare mark, better for
 * a brand whose icon is a wordmark; `logo` is the wordmark itself, which some
 * brands are more recognisable as. Everything else in the path space — `mark`,
 * `avatar`, `idx/2` — silently returns the default asset rather than 404ing, so
 * it only LOOKS like there are more.
 */
export const LOGO_VARIANTS = ["icon", "symbol", "logo"] as const;
export type LogoVariant = (typeof LOGO_VARIANTS)[number];

const isVariant = (value: string | undefined): value is LogoVariant =>
  LOGO_VARIANTS.includes(value as LogoVariant);

/**
 * The chosen variant per DOMAIN, on its own MMKV instance.
 *
 * Per domain and not per subscription: two Notion subscriptions are the same
 * brand and must not disagree about what Notion looks like. That is also why
 * this needs no schema change — it is a fact about a brand, not about a record,
 * so it never travels through `@subeye/model` or iCloud sync.
 *
 * Its own instance rather than a prefix in the logo cache: that cache evicts by
 * wiping itself when it fills, and a choice the user made by hand must not
 * disappear because they browsed 500 brands.
 */
const variants = createMMKV({ id: "subeye.logo-variants" });

/** Every variant the user has chosen, by domain. Read once, at boot. */
export function readStoredVariants(): Record<string, LogoVariant> {
  const stored: Record<string, LogoVariant> = {};
  for (const key of variants.getAllKeys()) {
    const value = variants.getString(key);
    if (isVariant(value)) stored[key] = value;
  }
  return stored;
}

/** Persist one choice. The live value is React state — see `useLogoVariants`. */
export function storeVariant(
  domain: string,
  variant: LogoVariant | null,
): void {
  if (variant) variants.set(domain, variant);
  else variants.remove(domain);
}

/**
 * A cached answer. `uri` is `null` for "this brand has no logo anywhere", which
 * is a real answer worth keeping — it is what stops three 404s per mount.
 */
export type LogoEntry = {
  uri: string | null;
  /** Whether the mark arrived from the `icon` tier — Brandfetch's square plate. */
  plate: boolean;
  /** The stored image's width / height. 1 when it could not be measured. */
  aspect: number;
  /** When this was fetched. */
  at: number;
};

/**
 * How much of the avatar's circle this logo's mark occupies, as a fraction of
 * the diameter.
 *
 * A square plate FILLS it. That plate is Brandfetch's `icon`, an opaque JPEG of
 * the brand's own app icon, and the circle only ever cuts its corners: measured
 * over 18 brands, 14 have nothing but background out there, and the four that
 * do — Spotify, Duolingo, iCloud, Notion — are marks that fill their own frame
 * on purpose. So the clip costs almost nothing, and filling is what makes a row
 * read as the brand rather than as a sticker on a dark disc.
 *
 * Insetting it is not an option, however cramped Notion's cube looks: the plate
 * is opaque, so any margin paints the plate's OWN background as a ring. Spotify
 * is a green disc on a white square, and at 0.86 that ring was white.
 *
 * A mark that is not a square plate has no field of its own, so its whole box
 * has to fit INSIDE the circle: for a long edge `long` times the short one, the
 * largest that fits is `long / √(1 + long²)` of the diameter. That is √½ at
 * square, which is the constant this used to hardcode for every image, and
 * hardcoding it is what drew iCloud's 512×333 cloud at 60% of the circle where
 * measured it asks for 0.84.
 */
export function logoFill(entry: { plate: boolean; aspect: number }): number {
  const long = Math.max(entry.aspect, 1 / entry.aspect);
  // Within 6% of square is a plate that a resize rounded off, not a wide mark.
  return entry.plate && long < 1.06 ? 1 : long / Math.hypot(1, long);
}

/**
 * ONE source size per kind, not one per view size.
 *
 * Every call site used to ask for its own pixel size — 84, 108, 114, 120 and
 * 162 on a 3x screen — so one brand meant five URLs, five cache entries and
 * five downloads. A single generous size is one entry every avatar draws from.
 *
 * 384, not 256, because a plate now fills the circle instead of sitting at 70%
 * of it: the detail hero's 108 pt avatar went from asking for 76 real pixels a
 * side to 108, which is 324 on a 3x screen. It is also close to free — most
 * brands store a 400 px square, so 384 is the last size that still downscales
 * rather than upscaling, and the file stays 4–8 KB.
 */
const SYMBOL_PX = 384;

/**
 * The banner blurs this into a colour wash, and `blurRadius` blurs the SOURCE
 * at its natural size: halve the source and the same radius averages the mark
 * into the flat grey the tuning comment there warns about. 768 is what a 3x
 * screen was already asking for.
 */
const PLATE_PX = 768;

/**
 * How long a stored logo stands before it is refreshed IN THE BACKGROUND.
 *
 * A logo is not news. Brands redraw their mark every few years, so a week is
 * generous and still catches a rebrand without the user ever seeing a load: the
 * cached bytes render, the refresh lands after them, and the picture only
 * changes if the CDN's did.
 */
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How long "this brand has no logo" stands.
 *
 * Much shorter than a hit, because it is a fact about the CDN rather than about
 * the brand — a company whose light symbol appears next week should get it. Six
 * hours costs at most one wasted walk per brand per session.
 */
const MISS_MS = 6 * 60 * 60 * 1000;

/**
 * How long a FAILED walk (offline, timeout) suppresses another for the same
 * key. In memory only: a network failure must not be written to disk, or a
 * flight would pin a brand to the letter tile for six hours after landing.
 *
 * The calendar is why this exists at all — it draws the same brand in a day
 * tile and again in the agenda, and the month pager remounts both on every
 * swipe.
 */
const RETRY_MS = 60 * 1000;

/** RN's fetch has no default timeout, and a captive portal never answers. */
const FETCH_TIMEOUT_MS = 8000;

/**
 * ponytail: a cache this small is not worth an LRU. The picker draws a logo for
 * every search result, so the key count grows with browsing rather than with
 * the user's list; at ~5 KB an entry this ceiling is ~2.5 MB, and hitting it
 * costs one round of refetching. Per-entry eviction if that ever bites.
 */
const MAX_ENTRIES = 500;

/**
 * The CDN paths for one variant, best first.
 *
 * `theme/light` leads the two transparent tiers because unpinned they come back
 * in whatever theme the brand stored — OpenAI's symbol is near-black, which is
 * near-invisible on this app's plate. `icon` has no such problem: it is an
 * opaque JPEG that carries its own background, and its `theme` variants are
 * byte-identical to it.
 */
const VARIANT_PATHS: Record<LogoVariant, readonly string[]> = {
  icon: ["icon"],
  symbol: ["symbol/theme/light", "symbol"],
  logo: ["logo/theme/light", "logo"],
};

/** Whether a path serves an opaque square that should fill the circle. */
const isPlate = (path: string) => path.startsWith("icon");

/**
 * Every source we will try for one domain, best first.
 *
 * `fallback/404` on the Brandfetch ones is deliberate: the default is
 * Brandfetch's own wordmark, which would put another company's logo on the
 * user's row. A 404 moves us down this list instead.
 *
 * `icon` LEADS the automatic order, and that inverted the order this had for
 * months. The old order preferred a bare `symbol` so the mark would sit on the
 * app's own plate. Measured across 40 brands (2026-09-03) that is simply the
 * worse picture: `icon` answered for every one of them, is a 400×400 opaque
 * square for all but icloud.com, and fills the circle the way an app icon does
 * — whereas a bare symbol has to be inset to √½ so the circle cannot clip it,
 * and lands as a small monochrome mark on dark grey. Amazon, Microsoft, Xbox,
 * Adobe and Google One were all drawing at 70% of a circle in their brand-less
 * colours when the same brands have a full-colour square one tier down.
 *
 * A CHOSEN variant leads instead, and the automatic order follows it: a brand
 * whose chosen variant later 404s falls back to a logo rather than to a letter.
 */
function sourcesFor(
  kind: LogoKind,
  domain: string,
  only: LogoVariant | null,
  preview = false,
): [{ uri: string; plate: boolean }, ...{ uri: string; plate: boolean }[]] {
  const encoded = encodeURIComponent(domain);
  const client = env.BRANDFETCH_CLIENT_ID;

  // Google's favicon endpoint serves discrete sizes and 256 is the largest.
  if (!client) {
    return [
      {
        uri: `https://www.google.com/s2/favicons?domain=${encoded}&sz=256`,
        plate: true,
      },
    ];
  }

  const px = kind === "plate" ? PLATE_PX : SYMBOL_PX;
  const source = (path: string) => ({
    uri: `https://cdn.brandfetch.io/${encoded}/${path}/fallback/404/h/${px}/w/${px}?c=${client}`,
    plate: isPlate(path),
  });

  // The banner blurs its copy into a colour wash and a transparent mark blurs
  // to almost nothing, so it always asks for the opaque square — whatever the
  // user chose for the avatar.
  if (kind === "plate") return [source("icon")];

  const paths = [
    ...(only ? VARIANT_PATHS[only] : []),
    // A preview asks for ONE variant and must report honestly that a brand has
    // no such mark, so it does not offer a tile that would fall through to a
    // different one.
    ...(preview ? [] : ["icon", "symbol/theme/light", "symbol"]),
  ];
  const [first, ...rest] = [...new Set(paths)].map(source);
  // `paths` always starts with a literal, so this is total.
  if (!first) throw new Error("no logo sources");
  return [first, ...rest];
}

/**
 * The variant is part of the key, so switching one does not evict the other:
 * flipping back and forth costs no network, and the two entries age out on
 * their own.
 *
 * EXCEPT FOR THE PLATE, which has no variants to keep apart — `sourcesFor` asks
 * for `icon` whatever the user chose. Keying it by that choice invented a
 * second key for byte-identical bytes, and it cost far more than the wasted
 * download: the detail banner reads its entry DURING RENDER, so picking a mark
 * in the form turned a hit into a miss and the banner behind the sheet went
 * BLACK until a 768 px refetch landed.
 */
const entryKey = (
  kind: LogoKind,
  variant: LogoVariant | null,
  domain: string,
) => `${kind}:${kind === "plate" ? "auto" : (variant ?? "auto")}:${domain}`;

/**
 * Parsed entries, in front of MMKV.
 *
 * Not a second source of truth — it holds exactly what is on disk. It exists
 * because the read happens during render and a month grid asks for the same
 * brand a dozen times: without it every one of those is a `JSON.parse` of a
 * base64 string.
 */
const parsed = new Map<string, LogoEntry>();

const isEntry = (value: unknown): value is LogoEntry => {
  const entry = value as LogoEntry | null;
  return (
    typeof entry?.at === "number" &&
    typeof entry.plate === "boolean" &&
    // Also the version gate: an entry written before the avatar measured its
    // images has no aspect, and reading it back as a square would full-bleed
    // iCloud's cloud. Rejecting it here refetches instead.
    typeof entry.aspect === "number" &&
    (entry.uri === null || typeof entry.uri === "string")
  );
};

/**
 * What is cached for this brand, or `null` for "never fetched". Synchronous —
 * the whole point of the cache is that a render can ask.
 */
export function readLogo(
  kind: LogoKind,
  domain: string,
  variant: LogoVariant | null,
): LogoEntry | null {
  return readEntry(entryKey(kind, variant, domain));
}

function readEntry(key: string): LogoEntry | null {
  const hit = parsed.get(key);
  if (hit) return hit;

  const raw = mmkv.getString(key);
  if (!raw) return null;

  try {
    const entry: unknown = JSON.parse(raw);
    if (!isEntry(entry)) return null;
    parsed.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

/** Whether a cached entry is due a background refresh. */
export const logoIsStale = (entry: LogoEntry, now = Date.now()): boolean =>
  now - entry.at > (entry.uri ? FRESH_MS : MISS_MS);

function writeLogo(key: string, entry: LogoEntry): LogoEntry {
  if (!parsed.has(key) && mmkv.getAllKeys().length >= MAX_ENTRIES) {
    mmkv.clearAll();
    mmkv.trim();
    parsed.clear();
  }
  parsed.set(key, entry);
  mmkv.set(key, JSON.stringify(entry));
  return entry;
}

/** Resolves to the data URI, or `null` for a source that answered "not here". */
async function download(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    // Brandfetch gates on User-Agent and answers a browser-ish one with 380 KB
    // of HTML under a 200. Storing that as a logo would poison the entry for a
    // week; every real hit is an `image/*`.
    if (!(response.headers.get("content-type") ?? "").startsWith("image/")) {
      return null;
    }
    return await toDataUri(await response.blob());
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The one native hop. RN implements `readAsDataURL` and hands back exactly the
 * `data:image/webp;base64,…` string `Image` wants — there is no way to get at
 * response bytes as base64 in RN that is shorter than this.
 */
const toDataUri = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("logo read"));
    reader.readAsDataURL(blob);
  });

/**
 * The stored image's aspect ratio, measured rather than assumed.
 *
 * Brandfetch's `w`/`h` are a BOUNDING BOX, not a size: every tier fits inside
 * it and keeps its own proportions. So `icon` is a 400×400 opaque plate for
 * almost every brand and a 512×333 transparent cloud for icloud.com, and the
 * tier that answered cannot tell those apart — only the pixels can.
 *
 * `Image.getSize` reads the decoded header through the same loader that will
 * draw it, so it costs one hop per FETCH, not per render, and the answer is
 * cached with the bytes.
 *
 * Resolves 1 rather than rejecting: an image we cannot measure is treated as
 * the square it usually is, which is what this did before it measured anything.
 */
const measure = (uri: string): Promise<number> =>
  new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve(width > 0 && height > 0 ? width / height : 1),
      () => resolve(1),
    );
  });

const inFlight = new Map<string, Promise<LogoEntry | null>>();
const attemptedAt = new Map<string, number>();

async function walk(
  kind: LogoKind,
  domain: string,
  key: string,
  only: LogoVariant | null,
  preview = false,
): Promise<LogoEntry | null> {
  // A 404 from every tier is an answer worth caching; a throw is not, and must
  // not be recorded as one.
  let answered = true;

  for (const source of sourcesFor(kind, domain, only, preview)) {
    try {
      const uri = await download(source.uri);
      if (uri) {
        return writeLogo(key, {
          uri,
          plate: source.plate,
          aspect: await measure(uri),
          at: Date.now(),
        });
      }
    } catch {
      answered = false;
    }
  }

  return answered
    ? writeLogo(key, { uri: null, plate: false, aspect: 1, at: Date.now() })
    : null;
}

/**
 * Fetch this brand's logo into the cache, walking the ladder until a source
 * serves an image.
 *
 * Never throws and never blocks a render: callers keep drawing whatever
 * `readLogo` already gave them and swap only once this resolves with something
 * new. Resolves `null` when nothing was learned — every tier failed on the
 * network, or another attempt is already in flight or too recent.
 *
 * Deduplicated per key rather than notified globally: a dozen rows of the same
 * brand share one walk and each re-renders itself off the same promise. An
 * earlier version pushed advances out to every mounted logo and several brands
 * stopped resolving at all.
 */
export function loadLogo(
  kind: LogoKind,
  domain: string,
  variant: LogoVariant | null,
): Promise<LogoEntry | null> {
  const key = entryKey(kind, variant, domain);
  const running = inFlight.get(key);
  if (running) return running;

  const now = Date.now();
  if (now - (attemptedAt.get(key) ?? 0) < RETRY_MS)
    return Promise.resolve(null);
  attemptedAt.set(key, now);

  const run = walk(kind, domain, key, variant).finally(() =>
    inFlight.delete(key),
  );
  inFlight.set(key, run);
  return run;
}

/**
 * What one variant of this brand actually looks like, or `null` when the brand
 * has no mark of that shape.
 *
 * Written into the cache under the variant's OWN key, so choosing a tile the
 * picker already drew costs no second download.
 */
export async function previewVariant(
  domain: string,
  variant: LogoVariant,
): Promise<LogoEntry | null> {
  const key = entryKey("symbol", variant, domain);
  const cached = readEntry(key);
  if (cached && !logoIsStale(cached)) return cached.uri ? cached : null;

  const entry = await walk("symbol", domain, key, variant, true);
  return entry?.uri ? entry : null;
}

/**
 * Drop every cached logo. Part of "Erase all data": the keys are the domains of
 * the brands the user tracked, so what is left behind names their list even
 * after the document is gone.
 */
export function clearLogos(): void {
  variants.clearAll();
  variants.trim();
  mmkv.clearAll();
  // `clearAll` tombstones; MMKV appends to an mmap file and never shrinks it on
  // its own, and Documents travels into device backups. Same reasoning as
  // eraseDoc.
  mmkv.trim();
  parsed.clear();
  attemptedAt.clear();
}
