import { Controller, Get, UseGuards } from "@nestjs/common";

//import { Controller, Get, Query, UseGuards } from "@nestjs/common";
// Query dekoratörünü ekliyoruz; URL'deki ?ad=aykut gibi veriyi almak 
// için gerekir.

import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UserProfileResponseDto } from "./dto/user-profile-response.dto";
import { UsersService } from "./users.service";




@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/v1/users endpoint'ini tanımlar. Bu endpoint, 
  // JWT kimlik doğrulama koruması altındadır ve yalnızca doğrulanmış 
  // kullanıcıların erişimine izin verir. İstek yapıldığında,
  // usersService'in getAllActiveProfiles yöntemini çağırarak tüm aktif
  // kullanıcı profillerini alır ve bunları UserProfileResponseDto 
  // formatında döndürür.


  @Get()
  @UseGuards(JwtAuthGuard)
  getUsers(): Promise<UserProfileResponseDto[]> {
    return this.usersService.getAllActiveProfiles();
  }

  //@Get()
  //@UseGuards(JwtAuthGuard)
  //getUsers(@Query("ad") ad?: string): Promise<UserProfileResponseDto[]> {
    //return this.usersService.getAllActiveProfiles(ad);
  //}

  


}




