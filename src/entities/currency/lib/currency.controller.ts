import { CurrencyService } from "./currency.service";

export class CurrencyController {
  private service: CurrencyService;

  public constructor() {
    this.service = new CurrencyService();
  }

  getRates(base: string) {
    return this.service.getRates(base);
  }
}
