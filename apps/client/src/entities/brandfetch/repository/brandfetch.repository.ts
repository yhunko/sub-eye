import { BrandfetchUtils } from "../lib/brandfetch-utils";
import type { BrandfetchSearchDto } from "../model/dtos";
import type { BrandfetchSearchParams } from "../model/params";

export class BrandfetchRepository {
  private readonly clientId = import.meta.env.VITE_BRANDFETCH_CLIENT_ID!;
  private readonly baseUrl = `https://${BrandfetchUtils.API_HOSTNAME}/v2`;

  async searchBrands({
    name,
  }: BrandfetchSearchParams): Promise<BrandfetchSearchDto[]> {
    if (!name) return [];

    const url = new URL(`${this.baseUrl}/search/${encodeURIComponent(name)}`);
    url.searchParams.append("c", this.clientId);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Brandfetch API error: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as BrandfetchSearchDto[];
  }
}
