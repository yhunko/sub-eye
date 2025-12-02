import axios, { AxiosInstance } from "axios";
import { MonobankCurrencyDto } from "../model/dtos";

export class MonobankRepository {
  protected client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_MONOBANK_API_URL,
    });
  }

  getCurrencies() {
    return this.client.get<MonobankCurrencyDto[]>("/bank/currency");
  }
}
