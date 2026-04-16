import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";       //CurrentUser dekoratörünü içe aktarır
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";                  //JwtAuthGuard'ı içe aktarır
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";      //AuthenticatedUser türünü içe aktarır
import { UserProfileResponseDto } from "../users/dto/user-profile-response.dto";          //UserProfileResponseDto'yu içe aktarır
import { AuthTokenResponseDto } from "./dto/auth-token-response.dto";                     //AuthTokenResponseDto'yu içe aktarır
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";     //RegisterDto'yu içe aktarır
import { AuthService } from "./auth.service";

@Controller("auth")                   //auth yolunu dinleyen bir denetleyici oluşturur
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")                   //Kayıt işlemi için bir POST isteği tanımlar
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto): Promise<AuthTokenResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post("login")                       //Giriş işlemi için bir POST isteği tanımlar
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<AuthTokenResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post("refresh")                    //Token yenileme işlemi için bir POST isteği tanımlar
  @HttpCode(HttpStatus.OK)
  refresh(@Body() refreshDto: RefreshDto): Promise<AuthTokenResponseDto> {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Get("me")                          //Mevcut kullanıcı bilgilerini almak için bir GET isteği tanımlar
  @UseGuards(JwtAuthGuard)  
  me(@CurrentUser() currentUser: AuthenticatedUser): Promise<UserProfileResponseDto> {
    return this.authService.getCurrentUser(currentUser);
  }

  
}
