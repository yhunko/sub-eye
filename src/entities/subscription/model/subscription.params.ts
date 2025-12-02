import { AddSubscriptionSchema } from "@/shared/lib/db";

export type AddSubscriptionParams = Omit<AddSubscriptionSchema, "userId">;
