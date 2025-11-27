import { AddSubscriptionDto } from "@/shared/lib/db";

export type AddSubscriptionParams = Omit<AddSubscriptionDto, "userId">;
