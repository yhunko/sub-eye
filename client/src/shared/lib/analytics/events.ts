import { posthog } from "./posthog";

type EventMap = {
  page_viewed: { path: string };
  subscription_created: { billing_period: string; currency: string };
  subscription_updated: Record<string, never>;
  subscription_deleted: Record<string, never>;
  subscription_canceled: Record<string, never>;
  subscription_renewed: Record<string, never>;
  price_change_scheduled: {
    effective_date_mode: "next_occurrence" | "custom";
  };
  price_change_canceled: Record<string, never>;
  price_change_applied_now: Record<string, never>;
  comparator_opened: Record<string, never>;
  comparator_step_completed: {
    step: 1 | 2 | 3 | 4;
    selection_mode?: "existing" | "manual";
  };
  comparator_completed: { switch_verdict: "switch" | "keep" | "neutral" };
  comparator_ai_analysis_requested: Record<string, never>;
  comparator_ai_analysis_completed: {
    mode: "ai" | "fallback";
    cache_hit: boolean;
    fallback_reason: "quota_exceeded" | "provider_unavailable" | "none";
  };
  comparator_ai_quota_badge_opened: {
    source: "comparator_header" | "comparator_ai_card";
    is_limited: boolean;
    used: number;
    remaining: number | null;
    limit: number | null;
  };
  comparator_upgrade_prompted: {
    reason: "quota_exceeded" | "ai_locked";
  };
  chart_cashflow_interacted: Record<string, never>;
  chart_spending_trend_month_drilldown: { month: string };
  settings_general_saved: {
    theme_changed: boolean;
    locale_changed: boolean;
    currency_changed: boolean;
    timezone_changed: boolean;
    date_format_changed: boolean;
  };
  notifications_push_enabled: Record<string, never>;
  notifications_push_disabled: Record<string, never>;
  notifications_telegram_connected: Record<string, never>;
  notifications_telegram_disconnected: Record<string, never>;
  notifications_test_sent: { channel: "push" | "telegram" };
  notifications_template_builder_opened: Record<string, never>;
  upgrade_prompt_viewed: {
    source:
      | "subscription_limit"
      | "comparator_quota"
      | "comparator_ai"
      | "notification_schedule"
      | "settings_billing";
    feature: string;
  };
  upgrade_checkout_started: Record<string, never>;
  upgrade_completed: Record<string, never>;
  billing_portal_opened: Record<string, never>;
};

type EventName = keyof EventMap;

type EventProps<T extends EventName> =
  EventMap[T] extends Record<string, never> ? [] : [props: EventMap[T]];

export function track<T extends EventName>(
  event: T,
  ...args: EventProps<T>
): void {
  posthog.capture(event, args[0] as Record<string, unknown>);
}
