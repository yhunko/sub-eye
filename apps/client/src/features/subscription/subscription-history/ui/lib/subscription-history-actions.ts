import type { SubscriptionAction } from "@subeye/shared";
import {
  Ban,
  Edit,
  IterationCw,
  type LucideIcon,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import * as m from "@/i18n/messages";

export const getSubscriptionHistoryActionLabel = (
  action: SubscriptionAction,
): string => {
  switch (action) {
    case "created":
      return m.subscription_history_action_created();
    case "updated":
      return m.subscription_history_action_updated();
    case "cancelled":
      return m.subscription_history_action_cancelled();
    case "renewed":
      return m.subscription_history_action_renewed();
    case "uncancelled":
      return m.subscription_history_action_uncancelled();
    case "deleted":
      return m.subscription_history_action_deleted();
    default:
      return action;
  }
};

export type HistoryActionVisual = {
  icon: LucideIcon;
  iconTone: string;
  badgeTone: string;
};

export const getSubscriptionHistoryActionVisual = (
  action: SubscriptionAction,
): HistoryActionVisual => {
  switch (action) {
    case "created":
      return {
        icon: Plus,
        iconTone: "bg-emerald-500/10 text-emerald-600",
        badgeTone: "border-emerald-400/50 text-emerald-700",
      };
    case "updated":
      return {
        icon: Edit,
        iconTone: "bg-blue-500/10 text-blue-600",
        badgeTone: "border-blue-400/50 text-blue-700",
      };
    case "cancelled":
      return {
        icon: Ban,
        iconTone: "bg-amber-500/10 text-amber-600",
        badgeTone: "border-amber-400/50 text-amber-700",
      };
    case "renewed":
      return {
        icon: IterationCw,
        iconTone: "bg-green-500/10 text-green-600",
        badgeTone: "border-green-400/50 text-green-700",
      };
    case "uncancelled":
      return {
        icon: Undo2,
        iconTone: "bg-cyan-500/10 text-cyan-600",
        badgeTone: "border-cyan-400/50 text-cyan-700",
      };
    case "deleted":
      return {
        icon: Trash2,
        iconTone: "bg-rose-500/10 text-rose-600",
        badgeTone: "border-rose-400/50 text-rose-700",
      };
    default:
      return {
        icon: Edit,
        iconTone: "bg-muted text-muted-foreground",
        badgeTone: "border-border text-muted-foreground",
      };
  }
};
