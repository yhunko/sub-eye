import { describe, expect, it } from "bun:test";
import { TelegramMessageTemplateService } from "../src/domains/telegram-notification/telegramMessageTemplateService";

describe("TelegramMessageTemplateService", () => {
  it("flags unknown variables", () => {
    const validation = TelegramMessageTemplateService.validateTemplate({
      version: 1,
      template: "Hello {subscription_name} {unknown_variable}",
    });

    expect(validation.valid).toBe(false);
    expect(validation.invalidVariables).toEqual(["unknown_variable"]);
  });

  it("renders whitelisted variables", () => {
    const rendered = TelegramMessageTemplateService.renderTemplate(
      {
        version: 1,
        template:
          "{subscription_name} renews {renewal_relative_day} at {price_preferred} ({price_original}) on {renewal_date}",
      },
      {
        subscriptionName: "1Password",
        renewalDate: "2026-03-10T10:00:00.000Z",
        referenceDate: new Date("2026-03-09T10:00:00.000Z"),
        timezone: "UTC",
        preferredPrice: { amount: 9.99, currencyCode: "usd" },
        originalPrice: { amount: 9.99, currencyCode: "usd" },
      },
      "en",
    );

    expect(rendered).toContain("1Password");
    expect(rendered).toContain("tomorrow");
    expect(rendered).toContain("$9.99");
  });

  it("returns default template for unsupported locale", () => {
    const template = TelegramMessageTemplateService.getDefaultTemplate("de-DE");

    expect(template.version).toBe(1);
    expect(template.template).toContain("{subscription_name}");
    expect(template.template).toContain("{price_preferred}");
  });
});
