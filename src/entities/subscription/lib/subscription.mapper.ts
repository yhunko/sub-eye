import { SubscriptionSchema } from "@/shared/lib/db/schema";
import {
  SubscriptionDto,
  SubscriptionBillingDetails,
} from "../model/subscription.dtos";

export class SubscriptionMapper {
  static toDto(
    subscription: SubscriptionSchema,
    billing: SubscriptionBillingDetails,
    nextPaymentDate: string,
    lastPaymentDate: string | null,
  ): SubscriptionDto {
    return {
      ...subscription,
      billing,
      nextPaymentDate,
      lastPaymentDate,
    };
  }
}
