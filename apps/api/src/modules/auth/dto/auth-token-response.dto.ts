import { UserProfileResponseDto } from "../../users/dto/user-profile-response.dto"; //UserProfileResponseDto'yu 
                                                                                   // içe aktarır

export class AuthTokenResponseDto {       //AuthTokenResponseDto, kimlik doğrulama işlemlerinden sonra döndürülecek token bilgilerini içeren bir DTO'dur
  accessToken!: string;                   //Erişim token'ını içeren bir alan ekler    
  refreshToken!: string;                  //Yenileme token'ını içeren bir alan ekler
  tokenType!: "Bearer";                   //Token türünü belirtir, genellikle "Bearer" olarak kullanılır
  user?: UserProfileResponseDto;
}
