"use server";

import { CurrencyController } from "../lib/currency.controller";

export const getRatesAction = async (base: string) => {
  const controller = new CurrencyController();

  return await controller.getRates(base);
};
