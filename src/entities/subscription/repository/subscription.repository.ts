import {
  SubscriptionSchema,
  subscriptionsTable,
  AddSubscriptionSchema,
} from "@/shared/lib/db/schema";
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

  async update(id: number, data: Partial<AddSubscriptionSchema>) {
    const [result] = await db
      .update(subscriptionsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, id))
      .returning();
    return result;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db
      .delete(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId));
  }

  async findById(id: number): Promise<SubscriptionSchema | null> {
    const [result] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, id));
    return result || null;
  }

  async delete(id: number): Promise<void> {
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.id, id));
  }
}
