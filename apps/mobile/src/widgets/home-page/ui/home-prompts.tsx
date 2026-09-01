import type { SubscriptionDto } from "@subeye/model";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";
import { usePro } from "@/entities/pro";
import { m } from "@/shared/i18n";
import {
  ensureNotificationPermission,
  readEffectiveSettings,
  readNotificationSettings,
  syncReminders,
  writeNotificationSettings,
} from "@/shared/lib/notifications";
import { nextPrompt, promptFlags } from "@/shared/lib/prompts";
import { askForReview, reviewDue, touchReviewClock } from "@/shared/lib/review";

/**
 * Renders nothing; says at most one unprompted thing per session, if anything.
 *
 * MOUNTING IS THE GATE. This lives inside Home's populated branch, so by the
 * time it runs the user is looking at a real monthly total rather than a
 * spinner, a load error or the first-run screen — and never at a form they are
 * halfway through, which is the interruption that makes any of this feel like a
 * toll. WHICH of the three it says is `nextPrompt`'s decision and is tested
 * there; this file only knows how to say them.
 *
 * The delay is the other half. `useFocusEffect` also fires on the cold start
 * that lands here, which is the one moment someone is on their way somewhere
 * else; waiting means the prompt arrives over a dashboard they have actually
 * read, and the cleanup cancels it outright for anyone who opened the app to do
 * one thing and moved straight on. It is also what keeps a prompt from landing
 * on top of the create-subscription modal's own dismiss animation, which is the
 * frame right after the third subscription is saved.
 */
export function HomePrompts({
  subscriptions,
}: {
  subscriptions: readonly SubscriptionDto[];
}) {
  const router = useRouter();
  const isPro = usePro();
  const tracked = subscriptions.length;

  useFocusEffect(
    useCallback(() => {
      // Unconditional and independent of what gets shown: the review clock has
      // to start on the first populated launch even if this session ends up
      // saying something else, or a week of reminder prompts would keep
      // resetting the settling period.
      touchReviewClock();

      const settings = readNotificationSettings();
      const kind = nextPrompt({
        tracked,
        isPro,
        remindersOn: settings.renewals || settings.trials,
        remindersAsked: promptFlags.remindersAsked(),
        proPitched: promptFlags.proPitched(),
        reviewDue: reviewDue(tracked),
      });
      if (!kind) return;

      const timer = setTimeout(() => {
        if (kind === "reminders") askAboutReminders();
        else if (kind === "pro") pitchPro();
        else void askForReview();
      }, 1800);

      return () => clearTimeout(timer);

      /**
       * The copy carries the load here, not the mechanism. Reminder settings
       * are per-DEVICE and apply to every subscription, but this arrives moments
       * after the user saved one — so without saying so outright it reads as a
       * switch on that subscription, and the next one they add goes unremindered
       * while they believe otherwise. Hence "for everything you track", and
       * hence naming Settings so the offer is visibly reversible.
       */
      function askAboutReminders() {
        // Marked on ASK, not on accept. A declined offer is answered, and
        // re-offering it every session is the nagging this is built to avoid;
        // Settings → Reminders is where someone who changes their mind goes.
        promptFlags.markRemindersAsked();

        Alert.alert(m.prompt_remindersTitle(), m.prompt_remindersBody(), [
          { text: m.prompt_notNow(), style: "cancel" },
          {
            text: m.prompt_remindersConfirm(),
            onPress: () => void turnOnReminders(),
          },
        ]);
      }

      async function turnOnReminders() {
        // Permission first, and the setting only if it is granted. Writing the
        // preference either way would leave Settings showing a switch that is
        // on over a schedule the OS will never deliver — the exact "silent
        // refusal vs app bug" confusion the notifications screen exists to
        // resolve.
        if (!(await ensureNotificationPermission())) return;

        writeNotificationSettings({ renewals: true });
        // Scheduled here rather than left to `ReminderSync`, whose effect keys
        // on the subscription list and the entitlement — neither of which just
        // moved. Without this the user gets nothing until the next foreground.
        await syncReminders(subscriptions, readEffectiveSettings(isPro));
      }

      // A sheet rather than an `Alert`: see `ProPitchSheet` for why the one
      // interruption that asks for money is the one that gets the app's own
      // surface. Marked on SHOW, not on tap — a dismissed pitch is answered.
      function pitchPro() {
        promptFlags.markProPitched();
        router.push("/pro-pitch");
      }
    }, [isPro, router, subscriptions, tracked]),
  );

  return null;
}
