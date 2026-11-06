import { describe, expect, it } from "bun:test";
import { bobby, bobbyPriceRange } from "../src/lib/bobby";
import {
  percentIncrease,
  priceRises,
  yearlyIncrease,
} from "../src/lib/priceRises";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// A rise is cited only from the service itself or an archived copy of its own
// page. A news roundup slipping in here is the failure this file exists for.
const OWN_HOSTS: Record<string, string[]> = {
  Netflix: ["help.netflix.com"],
  Spotify: ["newsroom.spotify.com", "www.spotify.com"],
  "YouTube Premium": ["www.youtube.com"],
  Crunchyroll: ["www.crunchyroll.com"],
};

describe("price-rise log", () => {
  it("cites only the service's own pages or archived copies of them", () => {
    for (const rise of priceRises) {
      const own = OWN_HOSTS[rise.service];
      expect({ service: rise.service, known: own !== undefined }).toEqual({
        service: rise.service,
        known: true,
      });
      for (const { url } of rise.sources) {
        const { host, pathname } = new URL(url);
        const target =
          host === "web.archive.org"
            ? new URL(pathname.replace(/^\/web\/\d+\//, "")).host
            : host;
        expect({ url, own: own?.includes(target) }).toEqual({ url, own: true });
      }
    }
  });

  it("records a real rise, dated in 2026 and read on a stated day", () => {
    for (const rise of priceRises) {
      expect(rise.to).toBeGreaterThan(rise.from);
      expect(rise.onPricingPage).toMatch(ISO_DAY);
      expect(rise.onPricingPage.startsWith("2026-")).toBe(true);
      if (rise.announced)
        expect(rise.announced <= rise.onPricingPage).toBe(true);
      expect(rise.read).toMatch(ISO_DAY);
      expect(rise.sources.length).toBeGreaterThan(0);
    }
  });

  it("lists rises in date order, so a new month appends at the end", () => {
    const dates = priceRises.map(
      (rise) => rise.announced ?? rise.onPricingPage,
    );
    expect(dates).toEqual([...dates].sort());
  });

  // (17.99 − 15.99) × 12 is 23.99999999999998 in floating point — Crunchyroll's
  // Ultimate Fan rise — so the yearly figure is rounded where it is computed.
  it("adds the rise up over a year to the cent", () => {
    expect(yearlyIncrease({ from: 15.99, to: 17.99 })).toBe(24);
    expect(yearlyIncrease({ from: 17.99, to: 19.99 })).toBe(24);
    expect(yearlyIncrease({ from: 11.99, to: 12.99 })).toBe(12);
    expect(yearlyIncrease({ from: 7.99, to: 8.99 })).toBe(12);
    expect(yearlyIncrease({ from: 13.99, to: 15.99 })).toBe(24);
  });

  it("states the rise as a share of the old price", () => {
    expect(percentIncrease({ from: 11.99, to: 12.99 })).toBe(8.3);
    expect(percentIncrease({ from: 7.99, to: 9.99 })).toBe(25);
    expect(percentIncrease({ from: 17.99, to: 19.99 })).toBe(11.1);
  });
});

describe("Bobby listing facts", () => {
  it("are dated and come from the US listing", () => {
    expect(bobby.read).toMatch(ISO_DAY);
    expect(bobby.versionDate).toMatch(ISO_DAY);
    expect(new URL(bobby.listing).host).toBe("apps.apple.com");
    expect(bobby.listing).toContain("/us/");
  });

  it("quotes the in-app purchase range the listing shows", () => {
    expect(bobbyPriceRange()).toEqual({ min: 0.99, max: 2.99 });
  });
});
