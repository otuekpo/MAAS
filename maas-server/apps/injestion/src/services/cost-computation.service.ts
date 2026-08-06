import { Injectable } from "@nestjs/common";
import { TRANSPORT_METRICS } from "@app/shared/constants/transport";

@Injectable()
export class CostComputationService {
  compute(distanceMiles: number, transport: string): number {
    const metric = TRANSPORT_METRICS[transport];
    if (!metric) return 0;
    return Number((distanceMiles * metric.ratePerMile).toFixed(2));
  }
}
