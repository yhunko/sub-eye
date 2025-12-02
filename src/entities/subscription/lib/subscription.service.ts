import { SubscriptionRepository } from "../repository/subscription.repository";
import { SubscriptionMapper } from "./subscription.mapper";
import { SubscriptionDto } from "../model/subscription.dtos";
import { AddSubscriptionParams } from "../model/subscription.params";

export class SubscriptionService {
  constructor(private repository = new SubscriptionRepository()) {}

  async getSubscriptionsForUser(userId: string): Promise<SubscriptionDto[]> {
    const subscriptions = await this.repository.findByUserId(userId);
    return subscriptions.map(SubscriptionMapper.toDto);
  }

  async addSubscription(
    params: AddSubscriptionParams,
    userId: string,
  ): Promise<SubscriptionDto> {
    const subscription = await this.repository.create(params, userId);
    return SubscriptionMapper.toDto(subscription);
  }
}
