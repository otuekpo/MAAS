export interface TransportMetric {
  averageSpeedMph: number;
  ratePerMile: number;
}

export const TRANSPORT_METRICS: Record<string, TransportMetric> = {
  Car: { averageSpeedMph: 60, ratePerMile: 0.15 },
  Bus: { averageSpeedMph: 45, ratePerMile: 0.1 },
  Train: { averageSpeedMph: 100, ratePerMile: 0.25 },
  Plane: { averageSpeedMph: 500, ratePerMile: 0.35 },
  Ferry: { averageSpeedMph: 30, ratePerMile: 0.2 },
};

export function formatEta(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
