import type { RouteMetrics, RoutePoint } from "./location.types";


//RouteEngine, rota hesaplama motorlarının uyması gereken bir sözleşmeyi tanımlar.
//  Bu sözleşme, belirli bir başlangıç noktası, varış noktası ve isteğe bağlı olarak 
// ara noktalar için rota metriklerini alma işlevini içerir. Her rota motoru, bu 
// arayüzü uygulayarak kendi özgü rota hesaplama algoritmalarını sunabilir.
export interface RouteEngine {
  readonly providerName: string;
  getRouteMetrics(
    origin: RoutePoint,
    destination: RoutePoint,
    waypoints?: RoutePoint[]
  ): Promise<RouteMetrics>;
}
