import {
  DateTimezoneUtils,
  type PushNotificationPayload,
} from "@subeye/shared";
import { differenceInCalendarDays } from "date-fns";

const APP_NOTIFICATION_ICON = "/assets/pwa/web-app-manifest-192x192.png";
const BRANDFETCH_CDN_HOSTNAME = "cdn.brandfetch.io";

type StaticNotificationCopy = {
  renewalTitle: string;
  renewalBody: (subscriptionName: string, relativeLabel: string) => string;
  expiryTitle: string;
  expiryBody: (subscriptionName: string, relativeLabel: string) => string;
  testTitle: string;
  testBody: string;
};

const COPY_BY_LOCALE: Record<string, StaticNotificationCopy> = {
  en: {
    renewalTitle: "Subscription Renewal",
    renewalBody: (subscriptionName, relativeLabel) =>
      `Your subscription for ${subscriptionName} renews ${relativeLabel}.`,
    expiryTitle: "Subscription Expiry",
    expiryBody: (subscriptionName, relativeLabel) =>
      `Your ${subscriptionName} subscription expires ${relativeLabel}.`,
    testTitle: "Test Notification",
    testBody: "If you see this, push notifications are working!",
  },
  uk: {
    renewalTitle: "Поновлення підписки",
    renewalBody: (subscriptionName, relativeLabel) =>
      `Підписка ${subscriptionName} поновиться ${relativeLabel}.`,
    expiryTitle: "Закінчення підписки",
    expiryBody: (subscriptionName, relativeLabel) =>
      `Підписка ${subscriptionName} закінчується ${relativeLabel}.`,
    testTitle: "Тестове сповіщення",
    testBody: "Якщо ви бачите це, push-сповіщення працюють.",
  },
};

type BuildRenewalNotificationPayloadInput = {
  locale?: string;
  timezone: string;
  paymentDate: string;
  notificationDate: Date;
  subscriptionId: string;
  subscriptionName: string;
  originalPriceAmount: number;
  originalPriceCurrencyCode: string;
  preferredPriceAmount: number;
  preferredPriceCurrencyCode: string;
  brandDomain?: string | null;
};

type BuildExpiryPayloadInput = {
  locale?: string;
  timezone: string;
  cancellationDate: string;
  notificationDate: Date;
  subscriptionId: string;
  subscriptionName: string;
  brandDomain?: string | null;
};

export class PushNotificationContent {
  static readonly defaultIcon = APP_NOTIFICATION_ICON;

  static buildRenewalPayload(
    input: BuildRenewalNotificationPayloadInput,
  ): PushNotificationPayload {
    const locale = PushNotificationContent.normalizeLocale(input.locale);
    const copy = PushNotificationContent.getCopy(locale);
    const relativeLabel = PushNotificationContent.getRelativeLabel({
      locale,
      timezone: input.timezone,
      paymentDate: input.paymentDate,
      notificationDate: input.notificationDate,
    });

    return {
      title: copy.renewalTitle,
      body: copy.renewalBody(input.subscriptionName, relativeLabel),
      icon: PushNotificationContent.resolveSubscriptionIcon(input.brandDomain),
      badge: APP_NOTIFICATION_ICON,
      tag: `subscription-renewal:${input.subscriptionId}`,
      data: {
        url: `/subscriptions/${input.subscriptionId}`,
        subscriptionId: input.subscriptionId,
        telegramTemplateContext: {
          kind: "renewal",
          subscriptionName: input.subscriptionName,
          renewalDate: input.paymentDate,
          timezone: input.timezone,
          preferredPrice: {
            amount: input.preferredPriceAmount,
            currencyCode: input.preferredPriceCurrencyCode,
          },
          originalPrice: {
            amount: input.originalPriceAmount,
            currencyCode: input.originalPriceCurrencyCode,
          },
        },
      },
    };
  }

  static buildExpiryPayload(
    input: BuildExpiryPayloadInput,
  ): PushNotificationPayload {
    const locale = PushNotificationContent.normalizeLocale(input.locale);
    const copy = PushNotificationContent.getCopy(locale);
    const relativeLabel = PushNotificationContent.getRelativeLabel({
      locale,
      timezone: input.timezone,
      paymentDate: input.cancellationDate,
      notificationDate: input.notificationDate,
    });

    return {
      title: copy.expiryTitle,
      body: copy.expiryBody(input.subscriptionName, relativeLabel),
      icon: PushNotificationContent.resolveSubscriptionIcon(input.brandDomain),
      badge: APP_NOTIFICATION_ICON,
      tag: `subscription-expiry:${input.subscriptionId}`,
      data: {
        kind: "expiry",
        url: `/subscriptions/${input.subscriptionId}`,
        subscriptionId: input.subscriptionId,
      },
    };
  }

  static buildTestPayload(locale?: string): PushNotificationPayload {
    const copy = PushNotificationContent.getCopy(
      PushNotificationContent.normalizeLocale(locale),
    );

    return {
      title: copy.testTitle,
      body: copy.testBody,
      icon: APP_NOTIFICATION_ICON,
      badge: APP_NOTIFICATION_ICON,
      data: {
        url: "/settings/notifications",
      },
    };
  }

  private static getRelativeLabel(input: {
    locale: string;
    timezone: string;
    paymentDate: string;
    notificationDate: Date;
  }): string {
    const paymentDay = DateTimezoneUtils.startOfDay(
      input.paymentDate,
      input.timezone,
    );
    const notifyDay = DateTimezoneUtils.startOfDay(
      input.notificationDate,
      input.timezone,
    );
    const dayOffset = Math.max(
      0,
      differenceInCalendarDays(paymentDay, notifyDay),
    );

    return new Intl.RelativeTimeFormat(input.locale, {
      numeric: "auto",
    }).format(dayOffset, "day");
  }

  private static resolveSubscriptionIcon(brandDomain?: string | null): string {
    const domain = PushNotificationContent.normalizeBrandDomain(brandDomain);
    if (!domain) {
      return APP_NOTIFICATION_ICON;
    }

    const clientId = PushNotificationContent.getBrandfetchClientId();
    if (!clientId) {
      return APP_NOTIFICATION_ICON;
    }

    const iconUrl = new URL(
      `https://${BRANDFETCH_CDN_HOSTNAME}/${encodeURIComponent(domain)}/w/128/h/128/fallback/lettermark/type/icon`,
    );
    iconUrl.searchParams.set("c", clientId);

    return iconUrl.toString();
  }

  private static getBrandfetchClientId(): string | null {
    const clientId = process.env.BRANDFETCH_CLIENT_ID;

    return clientId?.trim() || null;
  }

  private static normalizeBrandDomain(input?: string | null): string | null {
    const trimmed = input?.trim().toLowerCase();
    if (!trimmed) {
      return null;
    }

    const withoutScheme = trimmed.replace(/^https?:\/\//, "");
    const hostCandidate = withoutScheme.split("/")[0]?.replace(/\.$/, "");
    if (!hostCandidate) {
      return null;
    }

    const labels = hostCandidate.split(".");
    if (labels.length < 2) {
      return null;
    }

    const isValid = labels.every((label) => /^[a-z0-9-]+$/i.test(label));
    if (!isValid) {
      return null;
    }

    return hostCandidate;
  }

  private static getCopy(locale: string): StaticNotificationCopy {
    const base = locale.split("-")[0];
    if (base && COPY_BY_LOCALE[base]) {
      return COPY_BY_LOCALE[base];
    }

    return COPY_BY_LOCALE.en!;
  }

  private static normalizeLocale(locale?: string): string {
    if (!locale) {
      return "en";
    }

    try {
      return Intl.getCanonicalLocales(locale)[0] ?? "en";
    } catch {
      return "en";
    }
  }
}
