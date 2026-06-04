import { describe, expect, it } from "bun:test";
import {
  insertTokenAtSelection,
  renderTemplatePreview,
  validateTemplateDraft,
} from "./telegram-message-template.utils";

describe("telegram message template utils", () => {
  it("inserts token at selection", () => {
    const result = insertTokenAtSelection(
      "Hello world",
      "{subscription_name}",
      6,
      11,
    );

    expect(result.value).toBe("Hello {subscription_name}");
    expect(result.cursorPosition).toBe("Hello {subscription_name}".length);
  });

  it("validates unknown variables", () => {
    const validation = validateTemplateDraft("{subscription_name} {unknown}");

    expect(validation.valid).toBe(false);
    expect(validation.unknownVariables).toEqual(["unknown"]);
  });

  it("renders preview values", () => {
    const preview = renderTemplatePreview(
      "{subscription_name} {renewal_relative_day}",
      {
        subscription_name: "1Password",
        renewal_relative_day: "tomorrow",
      },
    );

    expect(preview).toBe("1Password tomorrow");
  });
});
