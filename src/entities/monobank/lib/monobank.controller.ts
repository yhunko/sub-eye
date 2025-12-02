import { MonobankService } from "./monobank.service";

export class MonobankController {
  private service: MonobankService;

  public constructor() {
    this.service = new MonobankService();
  }

  getCurrencies() {
    return this.service.getCurrencies();
  }
}
