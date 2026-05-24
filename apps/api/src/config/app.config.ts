//genell uyg. ayarları burada
//cors_origin: frontend uygulamasının çalıştığı adresi belirtir.
//varsayılan 4000 portunu kullanırız, ancak NEST_PORT ortam değişkeni tanımlanırsa onu kullanırız.
//burada ?? operatörünü kullanarak, eğer CORS_ORIGIN ortam değişkeni tanımlanmazsa,
//varsayılan olarak "http://localhost:3000" adresini kullanıyoruz. 
import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  port: Number(process.env.NEST_PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  allowLegacyNumericIds:
    process.env.ALLOW_LEGACY_NUMERIC_IDS?.trim().toLowerCase() === "true",
}));
