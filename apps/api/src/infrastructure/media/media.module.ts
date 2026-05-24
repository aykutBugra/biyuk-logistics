import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ImageProcessingService } from "./image-processing.service";
import { LocalMediaStorageService } from "./local-media-storage.service";
import { MediaStorageService } from "./media-storage.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    ImageProcessingService,
    LocalMediaStorageService,
    {
      //henüz localde saklandığından dolayı LocalMediaStorageService'i 
      //MediaStorageService olarak kullanırız.
      provide: MediaStorageService,
      useExisting: LocalMediaStorageService,
    },
  ],
  exports: [ImageProcessingService, MediaStorageService],
})
export class MediaModule {}
