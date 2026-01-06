"use server";

import { cookies } from "next/headers";

export const getLocaleAction = async () => {
  return (await cookies()).get("NEXT_LOCALE")?.value;
};
