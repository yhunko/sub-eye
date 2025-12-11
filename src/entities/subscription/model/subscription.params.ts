import { AddSubscriptionSchema } from "@/shared/lib/db/schema";

export type AddSubscriptionParams = Omit<AddSubscriptionSchema, "userId">;
