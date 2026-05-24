import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { registerAs } from "@nestjs/config";



//yüklenen görseller veritabanına kaydedilmez . sadece yolu koyulur . 
//frontend bu görseli göstermek için tam url ister . bu dosya da bunu ayarlar.
//drive:local ise, görseller sunucunun diskinde saklanır ve publicBaseUrl
//  ile başlayan bir URL üzerinden erişilir.
function resolveLocalUploadRoot(): string {
  const configuredRoot = process.env.MEDIA_LOCAL_ROOT?.trim();

  
  if (configuredRoot) {
    return resolve(configuredRoot);
  }

  const runningInsideApiWorkspace = existsSync(
    resolve(process.cwd(), "prisma/schema.prisma")
  );

  //.cwd ile çalışılan dizini alırız. uploads klasörünün yolu,
  //çalışılan dizine göre değişir.
  return runningInsideApiWorkspace
    ? resolve(process.cwd(), "uploads")
    : resolve(process.cwd(), "apps/api/uploads");
}

export default registerAs("media", () => ({
  driver: (process.env.MEDIA_DRIVER ?? "local").trim().toLowerCase(),
  publicBaseUrl:
    process.env.MEDIA_PUBLIC_BASE_URL?.trim() ??
    `http://localhost:${Number(process.env.NEST_PORT ?? 4000)}`,
    //görsel yolu ile birleşince  : http://localhost:4000/media/...  olur . 


  localRoot: resolveLocalUploadRoot(),
}));
