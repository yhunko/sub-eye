import {
  cancelWorkflow,
  resolveWorkflowUrl,
  serve,
  triggerWorkflow,
  type WorkflowContext,
} from "@subeye/scheduling";
import { UserService } from "../user/userService";
import { SubscriptionPricePhaseRepository } from "./subscriptionPricePhaseRepository";
import { SubscriptionRepository } from "./subscriptionRepository";

export type SubscriptionPhaseTransitionWorkflowPayload = {
  subscriptionId: string;
  phaseId: string;
  startsAt: string;
};

export class SubscriptionPhaseTransitionWorkflow {
  static handler = serve<SubscriptionPhaseTransitionWorkflowPayload>(
    async (
      context: WorkflowContext<SubscriptionPhaseTransitionWorkflowPayload>,
    ) => {
      const { subscriptionId, phaseId, startsAt } = context.requestPayload;
      const boundary = new Date(startsAt);
      if (Number.isNaN(boundary.getTime())) {
        return;
      }

      await context.sleepUntil("wait-for-phase-boundary", boundary);

      // Authoritative-run gating: only the run still owning this phase may
      // apply it. Stale duplicates from a reschedule race exit without effect.
      const isAuthoritative = await context.run(
        "authorize-apply-phase",
        async () => {
          const phase =
            await SubscriptionPricePhaseRepository.findById(phaseId);
          return SubscriptionPhaseTransitionWorkflow.isAuthoritativePhaseRun(
            phase,
            context.workflowRunId,
          );
        },
      );
      if (!isAuthoritative) {
        return;
      }

      await context.run("apply-phase", async () => {
        const { SubscriptionPhaseService } = await import(
          "./subscriptionPhaseService"
        );
        await SubscriptionPhaseService.applyPhaseByWorkflow({
          subscriptionId,
          phaseId,
        });
      });

      await context.run("notify-phase-change", async () => {
        const latest = await SubscriptionRepository.findById(subscriptionId);
        if (!latest) {
          return;
        }

        const preferences = await UserService.getUserPreferences(latest.userId);

        const phases =
          await SubscriptionPricePhaseRepository.findBySubscriptionId(
            subscriptionId,
          );
        const appliedPhase = phases.find((p) => p.id === phaseId);
        // The notification describes what ended: a trial/intro override whose
        // window closed at this boundary, otherwise a plain price change.
        const endingPhase = appliedPhase
          ? phases.find(
              (p) =>
                (p.kind === "trial" || p.kind === "intro") &&
                p.endsAt != null &&
                Date.parse(p.endsAt) === Date.parse(appliedPhase.startsAt),
            )
          : undefined;
        const notifyKind = endingPhase?.kind ?? "scheduledChange";

        const { PushNotificationContent } = await import(
          "../push-notification/pushNotificationContent"
        );
        const { PushNotificationService } = await import(
          "../push-notification/pushNotificationService"
        );
        const { NotificationDeliveryService } = await import(
          "../notification/notificationDeliveryService"
        );

        const payload = PushNotificationContent.buildPhaseChangePayload({
          locale: preferences.locale,
          subscriptionId: latest.id,
          subscriptionName: latest.name,
          brandDomain: latest.brandDomain,
          kind: notifyKind,
        });
        const vapidDetails = PushNotificationService.getVapidDetailsFromEnv();
        await NotificationDeliveryService.sendNotification(
          latest.userId,
          payload,
          { locale: preferences.locale, vapidDetails },
        );
      });

      await context.run("schedule-next-boundary", async () => {
        const phases =
          await SubscriptionPricePhaseRepository.findBySubscriptionId(
            subscriptionId,
          );
        const next = phases
          .filter((p) => p.appliedAt == null && !p.qstashMessageId)
          .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
        if (!next) {
          return;
        }

        const runId = await SubscriptionPhaseTransitionWorkflow.schedule({
          subscriptionId,
          phaseId: next.id,
          startsAt: next.startsAt,
        });
        await SubscriptionPricePhaseRepository.update(next.id, {
          qstashMessageId: runId,
        });
      });
    },
  );

  static isAuthoritativePhaseRun(
    phase: { qstashMessageId: string | null; appliedAt: string | null } | null,
    workflowRunId: string,
  ): boolean {
    return Boolean(
      phase &&
        phase.appliedAt === null &&
        phase.qstashMessageId === workflowRunId,
    );
  }

  static async schedule(
    payload: SubscriptionPhaseTransitionWorkflowPayload,
  ): Promise<string> {
    const workflowUrl = resolveWorkflowUrl(
      "/api/subscriptions/phase-transition/workflow",
    );
    const result = await triggerWorkflow({ url: workflowUrl, body: payload });

    return result.workflowRunId;
  }

  static async cancel(workflowRunId: string): Promise<void> {
    await cancelWorkflow(workflowRunId);
  }
}
