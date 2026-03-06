import { afterEach, describe, expect, it } from "bun:test";
import { PushNotificationContent } from "../src/domains/push-notification/pushNotificationContent";

const originalBrandfetchClientId = process.env.BRANDFETCH_CLIENT_ID;
const originalViteBrandfetchClientId = process.env.VITE_BRANDFETCH_CLIENT_ID;

const restoreBrandfetchEnv = () => {
  if (originalBrandfetchClientId) {
    process.env.BRANDFETCH_CLIENT_ID = originalBrandfetchClientId;
  } else {
    delete process.env.BRANDFETCH_CLIENT_ID;
  }

  if (originalViteBrandfetchClientId) {
    process.env.VITE_BRANDFETCH_CLIENT_ID = originalViteBrandfetchClientId;
  } else {
    delete process.env.VITE_BRANDFETCH_CLIENT_ID;
  }
};

describe("PushNotificationContent.buildRenewalPayload", () => {
  afterEach(() => {
    restoreBrandfetchEnv();
  });

  it("uses the Brandfetch client id from the server env", () => {
    process.env.BRANDFETCH_CLIENT_ID = "server_client_id";
    delete process.env.VITE_BRANDFETCH_CLIENT_ID;

    const payload = PushNotificationContent.buildRenewalPayload({
      locale: "en",
      timezone: "Europe/Kiev",
      paymentDate: "2026-03-08T10:00:00.000Z",
      notificationDate: new Date("2026-03-07T10:00:00.000Z"),
      subscriptionId: "sub_01",
      subscriptionName: "Netflix",
      brandDomain: "netflix.com",
    });

    expect(payload.icon).toBe(
      "https://cdn.brandfetch.io/netflix.com/w/128/h/128/fallback/lettermark/type/icon?c=server_client_id",
    );
  });

  it("falls back to the client env Brandfetch id when the server one is missing", () => {
    delete process.env.BRANDFETCH_CLIENT_ID;
    process.env.VITE_BRANDFETCH_CLIENT_ID = "vite_client_id";

    const payload = PushNotificationContent.buildRenewalPayload({
      locale: "en",
      timezone: "Europe/Kiev",
      paymentDate: "2026-03-08T10:00:00.000Z",
      notificationDate: new Date("2026-03-07T10:00:00.000Z"),
      subscriptionId: "sub_01",
      subscriptionName: "Netflix",
      brandDomain: "netflix.com",
    });

    expect(payload.icon).toBe(
      "https://cdn.brandfetch.io/netflix.com/w/128/h/128/fallback/lettermark/type/icon?c=vite_client_id",
    );
  });

  it("falls back to the app icon when Brandfetch is not configured", () => {
    delete process.env.BRANDFETCH_CLIENT_ID;
    delete process.env.VITE_BRANDFETCH_CLIENT_ID;

    const payload = PushNotificationContent.buildRenewalPayload({
      locale: "en",
      timezone: "Europe/Kiev",
      paymentDate: "2026-03-08T10:00:00.000Z",
      notificationDate: new Date("2026-03-07T10:00:00.000Z"),
      subscriptionId: "sub_01",
      subscriptionName: "Netflix",
      brandDomain: "netflix.com",
    });

    expect(payload.icon).toBe(PushNotificationContent.defaultIcon);
  });
});
