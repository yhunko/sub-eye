import { SubscriptionSchema, subscriptionsTable } from "@/shared/lib/db/schema";
import { db } from "@/shared/lib/drizzle/client";
import { eq } from "drizzle-orm";
import { AddSubscriptionParams } from "../model/subscription.params";

export class SubscriptionRepository {
  async findByUserId(userId: string): Promise<SubscriptionSchema[]> {
    return db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId));
  }

  async create(
    params: AddSubscriptionParams,
    userId: string,
  ): Promise<SubscriptionSchema> {
    const [subscription] = await db
      .insert(subscriptionsTable)
      .values({ ...params, userId })
      .returning();

    if (!subscription) {
      throw new Error("Failed to create subscription");
    }

    return subscription;
  }
}
