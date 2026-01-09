import axios, { AxiosInstance } from "axios";
import { BrandfetchSearchDto } from "../model/dtos";
import { BrandfetchSearchParams } from "../model/params";
import { BrandfetchUtils } from "../lib/brandfetch-utils";

export class BrandfetchRepository {
  private readonly clientId = process.env.BRANDFETCH_CLIENT_ID!;
  protected client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `https://${BrandfetchUtils.API_HOSTNAME}/v2`,
      params: {
        params: { c: this.clientId },
      },
    });
  }

  async searchBrands({
    name,
  }: BrandfetchSearchParams): Promise<BrandfetchSearchDto[]> {
    if (!name) return [];

    const response = await this.client.get<BrandfetchSearchDto[]>(
      `/search/${encodeURIComponent(name)}`,
      { params: { c: this.clientId } },
    );

    return response.data;
  }
}
