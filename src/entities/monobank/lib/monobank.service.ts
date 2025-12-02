import { MonobankRepository } from "../repository/monobank.repository";
import { MonobankMapper } from "./monobank.mapper";

export class MonobankService {
  constructor(private repository = new MonobankRepository()) {}

  async getCurrencies() {
    const { data: currencies } = await this.repository.getCurrencies();

    return currencies
      .filter(MonobankMapper.hasAvailableCurrencies)
      .map(MonobankMapper.toDto);
  }
}
