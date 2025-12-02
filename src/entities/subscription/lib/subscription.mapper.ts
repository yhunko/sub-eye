import { SubscriptionSchema } from "@/shared/lib/db";
import { SubscriptionDto } from "../model/subscription.dtos";

export class SubscriptionMapper {
  static toDto(subscription: SubscriptionSchema): SubscriptionDto {
    return {
      ...subscription,

      // TODO: Add logic to calculate monthly cost
      monthlyCost: Number(subscription.cost) / 12,
    };
  }
}
