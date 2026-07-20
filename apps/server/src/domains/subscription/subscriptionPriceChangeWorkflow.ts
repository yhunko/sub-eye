import {
  cancelWorkflow,
  resolveWorkflowUrl,
  serve,
  triggerWorkflow,
  type WorkflowContext,
} from "@subeye/scheduling";

export type SubscriptionPriceChangeWorkflowPayload = {
  subscriptionId: string;
  effectiveAt: string;
  scheduledCost: number;
  scheduledCurrency: string;
};

export class SubscriptionPriceChangeWorkflow {
  static handler = serve<SubscriptionPriceChangeWorkflowPayload>(
    async (
      context: WorkflowContext<SubscriptionPriceChangeWorkflowPayload>,
    ) => {
      const payload = context.requestPayload;
      const effectiveAt = new Date(payload.effectiveAt);

      if (Number.isNaN(effectiveAt.getTime())) {
        return;
      }

      await context.sleepUntil("wait-for-effective-at", effectiveAt);

      // Legacy bridge: in-flight runs scheduled before the pricing-phases
      // migration land here. The price change is now modelled as a pending
      // phase (backfilled), so apply any due phases for the subscription.
      await context.run("apply-scheduled-price-change", async () => {
        const { SubscriptionPhaseService } = await import(
          "./subscriptionPhaseService"
        );
        await SubscriptionPhaseService.applyDuePhases(payload.subscriptionId);
      });
    },
  );

  static async schedule(
    payload: SubscriptionPriceChangeWorkflowPayload,
  ): Promise<string> {
    const workflowUrl = resolveWorkflowUrl(
      "/api/subscriptions/price-change/workflow",
    );
    const result = await triggerWorkflow({ url: workflowUrl, body: payload });

    return result.workflowRunId;
  }

  static async cancel(workflowRunId: string): Promise<void> {
    await cancelWorkflow(workflowRunId);
  }
}
