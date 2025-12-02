import { SubscriptionSchema } from "@/shared/lib/db";

export interface SubscriptionDto extends SubscriptionSchema {
  monthlyCost: number;
}
