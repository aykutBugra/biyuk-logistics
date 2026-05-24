import { existsSync } from "node:fs";
import { resolve } from "node:path";


//env dosyasını nerede arayacağını belirler .
//proje farklı dizince başlasa da .env dosyasını bulabilmesi için bu fonksiyon kullanılır .
export function getEnvFilePaths(): string[] {
  const candidatePaths = [
    resolve(process.cwd(), "apps/api/.env"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
  ];

  //existsSync ile bu yolların var olup olmadığını kontrol ederiz ve var olanları döndürürüz.
  return [...new Set(candidatePaths.filter((path) => existsSync(path)))];
}
