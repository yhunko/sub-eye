import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { usePro } from "@/entities/pro";
import {
  nextPrompt,
  promptFlags,
  promptSession,
  remindersOfferDue,
} from "@/shared/lib/prompts";
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
export function HomePrompts({ tracked }: { tracked: number }) {
  const router = useRouter();
  const isPro = usePro();

  useFocusEffect(
    useCallback(() => {
      // Unconditional and independent of what gets shown: the review clock has
      // to start on the first populated launch even if this session ends up
      // saying something else, or a week of reminder prompts would keep
      // resetting the settling period.
      touchReviewClock();

      const kind = nextPrompt({
        tracked,
        isPro,
        proPitched: promptFlags.proPitched(),
        reviewDue: reviewDue(tracked),
        interrupted: promptSession.taken(),
        remindersPending: remindersOfferDue(),
      });
      if (!kind) return;

      const timer = setTimeout(() => {
        if (kind === "pro") {
          // Marked on SHOW, not on tap — a dismissed pitch is answered.
          promptFlags.markProPitched();
          promptSession.take();
          router.push("/pro-pitch");
          return;
        }

        // Taken only if the sheet was actually requested. `askForReview` gives
        // up without drawing anything on a build that cannot show it, and
        // spending the session there would silence the reminders offer for a
        // launch in which the user saw nothing at all.
        void askForReview().then((asked) => {
          if (asked) promptSession.take();
        });
      }, 1800);

      return () => clearTimeout(timer);
    }, [isPro, router, tracked]),
  );

  return null;
}
