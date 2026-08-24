import type { StartPhaseInput, SubscriptionDto } from "@subeye/model";
import type { Ports } from "@subeye/store";
import { applyPhaseNow, cancelPhase, startPhase } from "@subeye/store";
import { createPorts } from "../ports";

/**
 * The transport-side adapter over the phase use-cases in `@subeye/store`. The
 * boundary rules — `appliedAt` as the idempotency anchor, closing the phase a
 * apply-now displaces, laying a schedule down as override + revert — all live
 * there; the tenant is what this layer adds.
 */
export class SubscriptionPhaseService {
  static async startPhase(
    id: string,
    userId: string,
    payload: StartPhaseInput,
    ports: Ports = createPorts(userId),
  ): Promise<SubscriptionDto> {
    return startPhase(ports, id, payload);
  }

  static async cancelPhase(
    id: string,
    userId: string,
    phaseId: string,
    ports: Ports = createPorts(userId),
  ): Promise<SubscriptionDto> {
    return cancelPhase(ports, id, phaseId);
  }

  static async applyPhaseNow(
    id: string,
    userId: string,
    phaseId: string,
    ports: Ports = createPorts(userId),
  ): Promise<SubscriptionDto> {
    return applyPhaseNow(ports, id, phaseId);
  }
}
