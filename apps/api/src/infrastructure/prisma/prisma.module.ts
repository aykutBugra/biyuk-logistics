import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

//@global ile bu modülün sağlayıcıları uygulamanın 
//diğer bölümlerinde otomatik olarak kullanılabilir hale gelir.
@Global()
@Module({
  providers: [PrismaService],
  //exports ile PrismaService'i diğer modüllerde kullanılabilir hale getiririz.
  exports: [PrismaService],
})
export class PrismaModule {}
