import {
  cancelWorkflow,
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

      await context.run("apply-scheduled-price-change", async () => {
        const { SubscriptionPriceChangeService } = await import(
          "./subscriptionPriceChangeService"
        );
        await SubscriptionPriceChangeService.applyScheduledPriceChangeByWorkflow(
          payload,
        );
      });
    },
  );

  static async schedule(
    payload: SubscriptionPriceChangeWorkflowPayload,
  ): Promise<string> {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      throw new Error("Base URL is not set");
    }

    const workflowUrl = `${baseUrl}/api/subscriptions/price-change/workflow`;
    const result = await triggerWorkflow({ url: workflowUrl, body: payload });

    return result.workflowRunId;
  }

  static async cancel(workflowRunId: string): Promise<void> {
    await cancelWorkflow(workflowRunId);
  }
}
