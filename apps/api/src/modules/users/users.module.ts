import { Module } from "@nestjs/common";
import { RolesModule } from "../roles/roles.module";
import { UsersRepository } from "./repositories/users.repository";
import { UsersService } from "./users.service";

@Module({
  imports: [RolesModule],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
