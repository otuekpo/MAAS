import { Injectable } from "@nestjs/common";

export interface RouteWaypoint {
  lat: number;
  lng: number;
}

export interface StaticRoute {
  origin: string;
  destination: string;
  distanceMiles: number;
  waypoints: RouteWaypoint[];
}

@Injectable()
export class MapNavigationService {
  route(origin: string, destination: string, distanceMiles = 0): StaticRoute {
    // Mocked map navigation — returns a static, canned route regardless of
    // the origin/destination pair. A real integration would call a routing API.
    return {
      origin,
      destination,
      distanceMiles,
      waypoints: [
        { lat: 37.7749, lng: -122.4194 },
        { lat: 37.8044, lng: -122.2712 },
        { lat: 37.8715, lng: -122.273 },
      ],
    };
  }
}
