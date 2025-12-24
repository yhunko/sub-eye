import { SubscriptionService } from "./subscription.service";
import {
  AddSubscriptionParams,
  GetSubscriptionsParams,
} from "../model/subscription.params";
import { SubscriptionDto } from "../model/subscription.dtos";
import { SubscriptionSchema } from "@/shared/lib/db/schemas/subscription.schema";

export class SubscriptionController {
  private readonly userId: string;
  private service: SubscriptionService;

  public constructor(userId: string) {
    this.service = new SubscriptionService();
    this.userId = userId;
  }

  async getSubscriptions(
    params?: GetSubscriptionsParams,
  ): Promise<SubscriptionDto[]> {
    return await this.service.getSubscriptionsForUser(this.userId, params);
  }

  async addSubscription(
    payload: AddSubscriptionParams,
  ): Promise<SubscriptionSchema> {
    return await this.service.addSubscription(payload, this.userId);
  }

  async deleteSubscription(id: number): Promise<void> {
    return await this.service.deleteSubscription(id);
  }

  async deleteAllForCurrentUser(): Promise<boolean> {
    await this.service.deleteAllForUser(this.userId);

    return true;
  }
}
