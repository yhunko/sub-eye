import { SubscriptionService } from "./subscription.service";
import { AddSubscriptionParams } from "../model/subscription.params";
import { SubscriptionDto } from "../model/subscription.dtos";

export class SubscriptionController {
  private readonly userId: string;
  private service: SubscriptionService;

  public constructor(userId: string) {
    this.service = new SubscriptionService();
    this.userId = userId;
  }

  async getSubscriptions(): Promise<SubscriptionDto[]> {
    return await this.service.getSubscriptionsForUser(this.userId);
  }

  async addSubscription(
    payload: AddSubscriptionParams,
  ): Promise<SubscriptionDto> {
    return await this.service.addSubscription(payload, this.userId);
  }
}
