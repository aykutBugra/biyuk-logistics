//bu dosya, kullanıcılarla ilgili işlemleri yöneten bir NestJS denetleyicisidir.
//  Kullanıcı profillerini almak için bir GET isteği tanımlar ve JWT kimlik 
// doğrulama koruması uygular. Denetleyici, UsersService'i kullanarak aktif 
// kullanıcı profillerini döndürür.
import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UserProfileResponseDto } from "./dto/user-profile-response.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getUsers(): Promise<UserProfileResponseDto[]> {
    return this.usersService.getAllActiveProfiles();
  }
}
