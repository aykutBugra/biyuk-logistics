import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { UserProfileResponseDto } from "../users/dto/user-profile-response.dto";
import { CreateVehicleDto } from "../vehicles/dto/create-vehicle.dto";
import { AuthService } from "./auth.service";
import { AuthTokenResponseDto } from "./dto/auth-token-response.dto";
import { DismissDashboardIntroDto } from "./dto/dismiss-dashboard-intro.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto): Promise<AuthTokenResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<AuthTokenResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() refreshDto: RefreshDto): Promise<AuthTokenResponseDto> {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Post("me/carrier-onboarding")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  carrierOnboarding(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createVehicleDto: CreateVehicleDto
  ): Promise<AuthTokenResponseDto> {
    return this.authService.completeCarrierOnboarding(currentUser, createVehicleDto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() currentUser: AuthenticatedUser): Promise<UserProfileResponseDto> {
    return this.authService.getCurrentUser(currentUser);
  }

  @Patch("me/dashboard-intro")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  dismissDashboardIntro(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dismissDashboardIntroDto: DismissDashboardIntroDto
  ): Promise<UserProfileResponseDto> {
    return this.authService.dismissDashboardIntro(
      currentUser,
      dismissDashboardIntroDto.role
    );
  }

  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  deleteMe(@CurrentUser() currentUser: AuthenticatedUser): Promise<void> {
    return this.authService.deleteCurrentUser(currentUser);
  }
}
