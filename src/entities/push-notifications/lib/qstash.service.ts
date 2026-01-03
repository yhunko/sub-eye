import { Client } from "@upstash/qstash";

export class QStashService {
  private client: Client;

  constructor() {
    this.client = new Client({
      token: process.env.QSTASH_TOKEN!,
    });
  }

  async scheduleNotification(params: {
    userId: string;
    subscriptionId: string;
    subscriptionName: string;
    notifyAt: Date;
  }): Promise<string> {
    const { userId, subscriptionId, subscriptionName, notifyAt } = params;

    const response = await this.client.publishJSON({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`,
      headers: {
        "x-vercel-protection-bypass":
          process.env.VERCEL_AUTOMATION_BYPASS_SECRET!,
        "Upstash-Retries": "1",
      },
      body: {
        userId,
        subscriptionId,
        subscriptionName,
      },
      notBefore: Math.floor(notifyAt.getTime() / 1000),
    });

    return response.messageId;
  }

  async cancelNotification(messageId: string): Promise<void> {
    try {
      await this.client.messages.delete(messageId);
    } catch (error) {
      console.warn(`Could not cancel QStash message ${messageId}:`, error);
    }
  }

  async rescheduleNotification(params: {
    oldMessageId: string;
    userId: string;
    subscriptionId: string;
    subscriptionName: string;
    notifyAt: Date;
  }): Promise<string> {
    const { oldMessageId, ...scheduleParams } = params;

    await this.cancelNotification(oldMessageId);
    return await this.scheduleNotification(scheduleParams);
  }
}
