import { differenceInCalendarDays } from "date-fns";
import { DateTimezoneUtils, type PushNotificationPayload } from "shared";

const APP_NOTIFICATION_ICON = "/assets/pwa/web-app-manifest-192x192.png";

type StaticNotificationCopy = {
  renewalTitle: string;
  renewalBody: (subscriptionName: string, relativeLabel: string) => string;
  testTitle: string;
  testBody: string;
};

const COPY_BY_LOCALE: Record<string, StaticNotificationCopy> = {
  en: {
    renewalTitle: "Subscription Renewal",
    renewalBody: (subscriptionName, relativeLabel) =>
      `Your subscription for ${subscriptionName} renews ${relativeLabel}.`,
    testTitle: "Test Notification",
    testBody: "If you see this, push notifications are working!",
  },
  uk: {
    renewalTitle: "Поновлення підписки",
    renewalBody: (subscriptionName, relativeLabel) =>
      `Підписка ${subscriptionName} поновиться ${relativeLabel}.`,
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
  brandDomain?: string | null;
};

export class PushNotificationContent {
  static readonly defaultIcon = APP_NOTIFICATION_ICON;

  static buildRenewalPayload(
    input: BuildRenewalNotificationPayloadInput,
  ): PushNotificationPayload {
    const locale = this.normalizeLocale(input.locale);
    const copy = this.getCopy(locale);
    const relativeLabel = this.getRelativeLabel({
      locale,
      timezone: input.timezone,
      paymentDate: input.paymentDate,
      notificationDate: input.notificationDate,
    });

    return {
      title: copy.renewalTitle,
      body: copy.renewalBody(input.subscriptionName, relativeLabel),
      icon: this.resolveSubscriptionIcon(input.brandDomain),
      badge: APP_NOTIFICATION_ICON,
      tag: `subscription-renewal:${input.subscriptionId}`,
      data: {
        url: `/subscriptions/${input.subscriptionId}`,
        subscriptionId: input.subscriptionId,
      },
    };
  }

  static buildTestPayload(locale?: string): PushNotificationPayload {
    const copy = this.getCopy(this.normalizeLocale(locale));

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
    const normalizedDomain = this.normalizeDomain(brandDomain);
    if (!normalizedDomain) {
      return APP_NOTIFICATION_ICON;
    }

    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(normalizedDomain)}&sz=128`;
  }

  private static normalizeDomain(input?: string | null): string | null {
    if (!input) {
      return null;
    }

    const trimmed = input.trim().toLowerCase();
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
