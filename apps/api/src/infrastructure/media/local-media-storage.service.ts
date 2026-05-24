import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import {
  MediaStorageService,
  type SavedMediaFile,
  type SaveMediaFileInput,
} from "./media-storage.service";


//local dosya sistemi üzerinde medya dosyalarını kaydetmek, silmek
//ve erişilebilir URL'ler oluşturmak için kullanılan bir servis.
@Injectable()
export class LocalMediaStorageService extends MediaStorageService {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async saveFile(input: SaveMediaFileInput): Promise<SavedMediaFile> {
    const absolutePath = this.resolveAbsolutePath(input.storageKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.buffer);

    return {
      storageKey: input.storageKey,
    };
  }

  async deleteFile(storageKey: string): Promise<void> {
    const absolutePath = this.resolveAbsolutePath(storageKey);
    await rm(absolutePath, {
      force: true,
    });
  }


  //dosyanın frontendde açılacak url sini oluşturulur .
  toPublicUrl(storageKey: string): string {
    const publicBaseUrl = this.configService.getOrThrow<string>("media.publicBaseUrl");
    const normalizedBaseUrl = publicBaseUrl.replace(/\/+$/, "");
    return `${normalizedBaseUrl}/uploads/${storageKey}`;
  }

  private resolveAbsolutePath(storageKey: string): string {
    const localRoot = this.configService.getOrThrow<string>("media.localRoot");
    return join(localRoot, storageKey);
  }
}
