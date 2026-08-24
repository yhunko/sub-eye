import type { UpdateUserPreferences, UserPreferences } from "@subeye/model";
import type { Ports } from "@subeye/store";
import { readPreferences, writePreferences } from "@subeye/store";
import { createPorts } from "../ports";

export class UserService {
  /**
   * Preferences come from Postgres. Before v4 this hit Clerk on every call —
   * an external round-trip on the hottest path — and could even write back to
   * Clerk during a plain read.
   */
  static async getUserPreferences(
    userId: string,
    ports: Ports = createPorts(userId),
  ): Promise<UserPreferences> {
    return readPreferences(ports);
  }

  static async updateUserPreferences(
    userId: string,
    patch: UpdateUserPreferences,
    ports: Ports = createPorts(userId),
  ): Promise<UserPreferences> {
    return writePreferences(ports, patch);
  }
}
