import { describe, expect, it } from "bun:test";
import { decodeBase64Url, encodeBase64Url } from "./base64";

describe("base64 utils", () => {
  it("round-trips utf-8 content through base64url helpers", () => {
    const encoded = encodeBase64Url("Порівняння планів");

    expect(decodeBase64Url(encoded)).toBe("Порівняння планів");
  });
});
