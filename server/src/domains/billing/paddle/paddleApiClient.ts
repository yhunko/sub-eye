import type {
  PaddleCustomer,
  PaddleEnvironment,
  PaddlePortalSession,
  PaddlePrice,
  PaddleTransaction,
} from "./paddleTypes";

type PaddleApiResponse<T> = {
  data: T;
};

export class PaddleApiClient {
  static getEnvironment(): PaddleEnvironment {
    const env = process.env.PADDLE_ENV;

    if (env === "sandbox" || env === "live") {
      return env;
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error("PADDLE_ENV is required in production");
    }

    return "sandbox";
  }

  static isSandbox(): boolean {
    return this.getEnvironment() === "sandbox";
  }

  static async listActivePrices(): Promise<PaddlePrice[]> {
    const query = new URLSearchParams({
      status: "active",
      per_page: "200",
    });

    const res = await this.request<PaddleApiResponse<PaddlePrice[]>>(
      `/prices?${query.toString()}`,
      {
        method: "GET",
      },
    );

    return res.data;
  }

  static async createCustomer(input: {
    email: string;
    name?: string;
  }): Promise<PaddleCustomer> {
    const res = await this.request<PaddleApiResponse<PaddleCustomer>>(
      "/customers",
      {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          ...(input.name ? { name: input.name } : undefined),
        }),
      },
    );

    return res.data;
  }

  static async createTransaction(input: {
    customerId?: string;
    priceId: string;
    customData: Record<string, unknown>;
  }): Promise<PaddleTransaction> {
    const body: {
      customer_id?: string;
      collection_mode: "automatic";
      items: Array<{
        price_id: string;
        quantity: number;
      }>;
      custom_data: Record<string, unknown>;
    } = {
      collection_mode: "automatic",
      items: [
        {
          price_id: input.priceId,
          quantity: 1,
        },
      ],
      custom_data: input.customData,
    };

    if (input.customerId) {
      body.customer_id = input.customerId;
    }

    const res = await this.request<PaddleApiResponse<PaddleTransaction>>(
      "/transactions",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    return res.data;
  }

  static async createCustomerPortalSession(
    customerId: string,
  ): Promise<PaddlePortalSession> {
    const res = await this.request<PaddleApiResponse<PaddlePortalSession>>(
      `/customers/${customerId}/portal-sessions`,
      {
        method: "POST",
      },
    );

    return res.data;
  }

  private static getApiBaseUrl(): string {
    return this.isSandbox()
      ? "https://sandbox-api.paddle.com"
      : "https://api.paddle.com";
  }

  private static getApiKey(): string {
    const apiKey = process.env.PADDLE_API_KEY;

    if (!apiKey) {
      throw new Error("PADDLE_API_KEY is not set");
    }

    if (!apiKey.startsWith("pdl_") || !apiKey.includes("_apikey_")) {
      throw new Error(
        "PADDLE_API_KEY must be a Paddle API key (pdl_*_apikey_*), not a client token",
      );
    }

    const inferredKeyEnvironment = apiKey.includes("_sdbx_")
      ? "sandbox"
      : apiKey.includes("_live_")
        ? "live"
        : null;
    const configuredEnvironment = this.getEnvironment();

    if (
      inferredKeyEnvironment &&
      inferredKeyEnvironment !== configuredEnvironment
    ) {
      throw new Error(
        `PADDLE_API_KEY environment (${inferredKeyEnvironment}) does not match PADDLE_ENV (${configuredEnvironment})`,
      );
    }

    return apiKey;
  }

  private static async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.getApiKey()}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let detailMessage = errorBody.slice(0, 500);
      let errorCode: string | null = null;

      try {
        const parsed = JSON.parse(errorBody) as {
          error?: { detail?: string; code?: string };
        };
        detailMessage = parsed.error?.detail ?? detailMessage;
        errorCode = parsed.error?.code ?? null;
      } catch {
        // Keep raw response text if JSON parsing fails.
      }

      const method = (init.method ?? "GET").toUpperCase();

      if (response.status === 403 || errorCode === "forbidden") {
        throw new Error(
          [
            `Paddle API request forbidden (${method} ${path}).`,
            detailMessage,
            "Check PADDLE_ENV vs key environment and API key permissions: price.read, customer.write, transaction.write, customer_portal_session.write.",
          ].join(" "),
        );
      }

      throw new Error(
        `Paddle API request failed (${response.status}, ${method} ${path}): ${detailMessage}`,
      );
    }

    return (await response.json()) as T;
  }
}
