import type { RouteMetrics, RoutePoint } from "./location.types";

export interface RouteEngine {
  readonly providerName: string;
  getRouteMetrics(
    origin: RoutePoint,
    destination: RoutePoint,
    waypoints?: RoutePoint[]
  ): Promise<RouteMetrics>;
}
