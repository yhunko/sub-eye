import { describe, expect, it } from "bun:test";
import { legalUrl } from "./legal-url";

// These four strings are a contract with the marketing site, not an
// implementation detail: App Store Connect rejects a 404 Privacy Policy URL, and
// Settings → Legal opens them in front of the reviewer. If the site's routing
// changes, this is what should fail first.
describe("legalUrl", () => {
  it("prefixes English too — the site serves no unprefixed root pages", () => {
    expect(legalUrl("terms-of-service", "en")).toBe(
      "https://www.subeye.cc/en/terms-of-service/",
    );
    expect(legalUrl("privacy-policy", "en")).toBe(
      "https://www.subeye.cc/en/privacy-policy/",
    );
  });

  it("serves Ukrainian from /uk", () => {
    expect(legalUrl("terms-of-service", "uk")).toBe(
      "https://www.subeye.cc/uk/terms-of-service/",
    );
    expect(legalUrl("privacy-policy", "uk")).toBe(
      "https://www.subeye.cc/uk/privacy-policy/",
    );
  });
});
