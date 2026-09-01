import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { maybeAskForReview } from "@/shared/lib/review";

/**
 * Renders nothing; asks for an App Store rating at the one moment the app has
 * already made its case.
 *
 * MOUNTING IS THE GATE. This is rendered only inside Home's populated branch,
 * so by the time it runs the user is looking at a real monthly total rather
 * than a spinner, a load error or the first-run screen — and never at a form
 * they are halfway through, which is the interruption that makes a rating
 * prompt feel like a toll. How long they have had the app and when they were
 * last asked are `maybeAskForReview`'s business, not this component's.
 *
 * The delay is the other half of that. `useFocusEffect` also fires on the cold
 * start that lands here, which is the one moment someone is on their way
 * somewhere else; waiting means the sheet arrives over a dashboard they have
 * actually read, and the cleanup cancels it outright for anyone who opened the
 * app to do one thing and moved straight on.
 */
export function ReviewPrompt({ tracked }: { tracked: number }) {
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        void maybeAskForReview(tracked);
      }, 2500);
      return () => clearTimeout(timer);
    }, [tracked]),
  );

  return null;
}
