import {
  DateTimezoneUtils,
  TELEGRAM_TEMPLATE_VARIABLES,
  type TelegramMessageTemplate,
  TelegramMessageTemplateSchema,
} from "@subeye/shared";
import { differenceInCalendarDays } from "date-fns";
import * as v from "valibot";

const PLACEHOLDER_REGEX = /\{([a-z_]+)\}/g;
const ALLOWED_VARIABLES = new Set<string>(TELEGRAM_TEMPLATE_VARIABLES);
const FALLBACK_LOCALE = "en";
const DEFAULT_TIMEZONE = "UTC";
const MAX_RENDERED_MESSAGE_LENGTH = 4096;
const CONTROL_CHARACTERS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

type PriceValue = {
  amount: number;
  currencyCode: string;
};

export type TelegramTemplateRenderContext = {
  subscriptionName: string;
  renewalDate: string | Date;
  referenceDate: Date;
  timezone?: string;
  preferredPrice: PriceValue;
  originalPrice: PriceValue;
};

const DEFAULT_TEMPLATE_BY_LOCALE: Record<string, string> = {
  en: [
    "🔔 {subscription_name} is renewing {renewal_relative_day}.",
    "",
    "💰 {price_preferred}",
    "📅 Renewal date: {renewal_date}",
  ].join("\n"),
  uk: [
    "🔔 {subscription_name} поновиться {renewal_relative_day}.",
    "",
    "💰 {price_preferred}",
    "📅 Дата поновлення: {renewal_date}",
  ].join("\n"),
};

export class TelegramMessageTemplateService {
  static getDefaultTemplate(locale?: string): TelegramMessageTemplate {
    const normalizedLocale =
      TelegramMessageTemplateService.normalizeLocale(locale);
    const baseLocale = normalizedLocale.split("-")[0] ?? FALLBACK_LOCALE;

    return {
      version: 1,
      template:
        DEFAULT_TEMPLATE_BY_LOCALE[baseLocale] ??
        DEFAULT_TEMPLATE_BY_LOCALE.en!,
    };
  }

  static parseStoredTemplate(raw: unknown): TelegramMessageTemplate | null {
    const parsed = v.safeParse(TelegramMessageTemplateSchema, raw);

    if (!parsed.success) {
      return null;
    }

    if (
      !TelegramMessageTemplateService.isTemplateSafe(parsed.output.template)
    ) {
      return null;
    }

    return parsed.output;
  }

  static validateTemplate(messageTemplate: TelegramMessageTemplate): {
    valid: boolean;
    invalidVariables: string[];
  } {
    const placeholders = TelegramMessageTemplateService.extractVariables(
      messageTemplate.template,
    );
    const invalidVariables = [...new Set(placeholders)].filter(
      (variable) => !ALLOWED_VARIABLES.has(variable),
    );

    return {
      valid: invalidVariables.length === 0,
      invalidVariables,
    };
  }

  static renderTemplate(
    messageTemplate: TelegramMessageTemplate,
    context: TelegramTemplateRenderContext,
    locale?: string,
  ): string {
    const normalizedLocale =
      TelegramMessageTemplateService.normalizeLocale(locale);
    const timezone = context.timezone?.trim() || DEFAULT_TIMEZONE;
    const variables = TelegramMessageTemplateService.buildVariableMap(
      context,
      normalizedLocale,
      timezone,
    );

    const rendered = messageTemplate.template.replace(
      PLACEHOLDER_REGEX,
      (match, variable: string) => variables[variable] ?? match,
    );

    return TelegramMessageTemplateService.sanitizeRenderedMessage(rendered);
  }

  private static buildVariableMap(
    context: TelegramTemplateRenderContext,
    locale: string,
    timezone: string,
  ): Record<string, string> {
    const renewalDay = DateTimezoneUtils.startOfDay(
      context.renewalDate,
      timezone,
    );
    const referenceDay = DateTimezoneUtils.startOfDay(
      context.referenceDate,
      timezone,
    );
    const dayOffset = Math.max(
      0,
      differenceInCalendarDays(renewalDay, referenceDay),
    );

    return {
      subscription_name: context.subscriptionName,
      renewal_relative_day: new Intl.RelativeTimeFormat(locale, {
        numeric: "auto",
      }).format(dayOffset, "day"),
      price_preferred: TelegramMessageTemplateService.formatPrice(
        context.preferredPrice,
        locale,
      ),
      price_original: TelegramMessageTemplateService.formatPrice(
        context.originalPrice,
        locale,
      ),
      renewal_date: TelegramMessageTemplateService.formatDate(
        context.renewalDate,
        locale,
        timezone,
      ),
    };
  }

  private static extractVariables(template: string): string[] {
    const variables: string[] = [];

    for (const match of template.matchAll(PLACEHOLDER_REGEX)) {
      const variable = match[1];
      if (variable) {
        variables.push(variable);
      }
    }

    return variables;
  }

  private static sanitizeRenderedMessage(input: string): string {
    const cleaned = input
      .replace(/\r\n?/g, "\n")
      .replace(CONTROL_CHARACTERS_REGEX, "")
      .trim();

    if (cleaned.length <= MAX_RENDERED_MESSAGE_LENGTH) {
      return cleaned;
    }

    return `${cleaned.slice(0, MAX_RENDERED_MESSAGE_LENGTH - 1)}…`;
  }

  private static formatPrice(price: PriceValue, locale: string): string {
    const currencyCode = price.currencyCode.trim().toUpperCase();

    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
      }).format(price.amount);
    } catch {
      return `${currencyCode} ${price.amount.toFixed(2)}`;
    }
  }

  private static formatDate(
    dateValue: string | Date,
    locale: string,
    timezone: string,
  ): string {
    const date = DateTimezoneUtils.toZoned(dateValue, timezone);

    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeZone: timezone,
      }).format(date);
    } catch {
      return new Intl.DateTimeFormat(FALLBACK_LOCALE, {
        dateStyle: "medium",
      }).format(date);
    }
  }

  private static normalizeLocale(locale?: string): string {
    if (!locale) {
      return FALLBACK_LOCALE;
    }

    try {
      return Intl.getCanonicalLocales(locale)[0] ?? FALLBACK_LOCALE;
    } catch {
      return FALLBACK_LOCALE;
    }
  }

  private static isTemplateSafe(template: string): boolean {
    return template.length > 0 && template.length <= 2000;
  }
}
