import { Hono } from "hono";
import { object } from "valibot";
import { CurrencyService } from "../domains/currency/currencyService";
import { currencyBaseSchema } from "../domains/currency/currencyModel";
import { vValidator } from "@hono/valibot-validator";

export const currencyRouter = new Hono().get(
  "/rates/:base",
  vValidator("param", object({ base: currencyBaseSchema })),
  async (context) => {
    const { base } = context.req.valid("param");

    const rates = await CurrencyService.getRates(base);

    return context.json({
      base,
      rates,
    });
  },
);
