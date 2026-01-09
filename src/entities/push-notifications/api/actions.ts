"use server";

import webpush from "web-push";
import { auth } from "@clerk/nextjs/server";
import { PushNotificationsRepository } from "../repository/push-notifications.repository";

webpush.setVapidDetails(
  "mailto:yegorgunko@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const notificationsRepository = new PushNotificationsRepository();

export async function subscribeUserAction(
  sub: PushSubscriptionJSON,
): Promise<PushSubscriptionJSON> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (!sub.keys || !sub.endpoint) {
    throw new Error("Subscription is invalid");
  }

  const { endpoint, keys } = sub;

  await notificationsRepository.create({
    userId,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });

  return sub;
}

export async function unsubscribeUserAction() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  await notificationsRepository.deleteByUserId(userId);
}
