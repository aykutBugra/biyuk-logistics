import type { RouteMetrics, RoutePoint } from "./location.types";


//RouteEngine, rota hesaplama motorlarının uyması gereken bir sözleşmeyi tanımlar.
//  Bu sözleşme, belirli bir başlangıç noktası, varış noktası ve isteğe bağlı olarak 
// ara noktalar için rota metriklerini alma işlevini içerir. Her rota motoru, bu 
// arayüzü uygulayarak kendi özgü rota hesaplama algoritmalarını sunabilir.
export interface RouteEngine {
  readonly providerName: string;  //provider engine adını söyler:google
  getRouteMetrics(         //iki nokta arası rota metriklerini alma işlevi     
    origin: RoutePoint,    //başlangıç noktası
    destination: RoutePoint,//varış noktası
    waypoints?: RoutePoint[]//isteğe bağlı ara noktalar henüz kullanılmıyor
  ): Promise<RouteMetrics>; //distanceMeters ve durationSecconds içeren rota metriklerini döndürür
}
