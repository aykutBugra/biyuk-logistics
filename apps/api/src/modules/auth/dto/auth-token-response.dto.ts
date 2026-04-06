import { UserProfileResponseDto } from "../../users/dto/user-profile-response.dto";

export class AuthTokenResponseDto {
  accessToken!: string;
  refreshToken!: string;
  tokenType!: "Bearer";
  user?: UserProfileResponseDto;
}
