/**
 * Simulated Data Producer
 *
 * Stands in for real IoT/vehicle sensor feeds. Generates a batch of fake
 * sensor readings for a trip and POSTs them to the injestion service
 * (POST /api/ingest), which queues them onto the BullMQ broker.
 *
 * Usage:
 *   npm run simulate:sensors -- --trip-id=<mongo-trip-id> [--events=10] [--url=http://localhost:3001]
 */
import * as dotenv from "dotenv";
dotenv.config({ quiet: true });

interface Args {
  tripId: string;
  events: number;
  url: string;
}

const CITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Miami",
  "San Francisco",
  "Seattle",
  "Boston",
  "Denver",
  "Atlanta",
  "Dallas",
  "Houston",
  "Phoenix",
  "Las Vegas",
  "Washington DC",
  "Portland",
];

const TRANSPORTS = ["Car", "Bus", "Train", "Plane", "Ferry"];

function parseArgs(): Args {
  const raw = process.argv.slice(2);
  const get = (key: string) =>
    raw
      .find((a) => a.startsWith(`--${key}=`))
      ?.split("=")[1] as string | undefined;

  const tripId = get("trip-id");
  if (!tripId) {
    console.error(
      "Missing --trip-id=<mongo-trip-id>. Create a trip on the Trips page first, then pass its id.",
    );
    process.exit(1);
  }

  return {
    tripId,
    events: Number(get("events") ?? "5"),
    url: get("url") ?? `http://localhost:${process.env.INJESTION_PORT ?? 3001}`,
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDistance(from: string, to: string): number {
  // A rough distance (miles) for the pair — deterministic-ish and simple.
  const a = from.charCodeAt(0) + from.length;
  const b = to.charCodeAt(0) + to.length;
  return Math.max(20, Math.abs(a * 37 - b * 53) % 2600);
}

async function main() {
  const { tripId, events, url } = parseArgs();

  const generated = Array.from({ length: events }, () => {
    const origin = pick(CITIES);
    let destination = pick(CITIES);
    while (destination === origin) destination = pick(CITIES);

    return {
      trip_id: tripId,
      origin,
      destination,
      transport: pick(TRANSPORTS),
      distance_miles: randomDistance(origin, destination),
      lat: Number((Math.random() * 180 - 90).toFixed(6)),
      lng: Number((Math.random() * 360 - 180).toFixed(6)),
      timestamp: new Date().toISOString(),
    };
  });

  const endpoint = `${url}/api/ingest`;
  console.log(`Posting ${events} sensor event(s) to ${endpoint} for trip ${tripId}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: generated }),
  });
  
  const body = await response.json();
  console.log(`HTTP ${response.status}: ${JSON.stringify(body, null, 2)}`);

  if (!response.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
