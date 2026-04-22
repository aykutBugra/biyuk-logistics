import { registerAs } from "@nestjs/config";


//Bu dosya, haritalar (maps) ile ilgili yapılandırma ayarlarını tanımlamak için kullanılır.
export default registerAs("maps", () => ({
  provider: (process.env.MAP_PROVIDER ?? "google").trim().toLowerCase(),
  routeEngine: (process.env.ROUTE_ENGINE ?? "google").trim().toLowerCase(),
  googleApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
  defaultLanguageCode: (process.env.MAP_LANGUAGE_CODE ?? "tr").trim(),
  defaultRegionCode: (process.env.MAP_REGION_CODE ?? "TR").trim().toUpperCase(),
}));
