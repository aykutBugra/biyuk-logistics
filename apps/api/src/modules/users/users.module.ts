
//users module'ünün ana modülü. Kullanıcılarla ilgili tüm işlemler bu modül altında toplanır.
//users controller, service ve repository bu modülün altındadır. 
//RolesModule'u import ediyoruz çünkü kullanıcı oluştururken role ataması yapmamız gerekiyor.
import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { RolesModule } from "../roles/roles.module";
import { UsersController } from "./users.controller";
import { UsersRepository } from "./repositories/users.repository";
import { UsersService } from "./users.service";

@Module({
  imports: [RolesModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
