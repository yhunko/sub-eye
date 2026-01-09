"use server";

import { MonobankController } from "../lib/monobank.controller";

export const getCurrenciesAction = async () => {
  const controller = new MonobankController();

  return await controller.getCurrencies();
};
