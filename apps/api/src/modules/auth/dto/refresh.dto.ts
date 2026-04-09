import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator"; //class-validator kütüphanesinden gerekli doğrulama dekoratörlerini içe aktarır

export class RefreshDto {                              //RefreshDto, token yenileme işlemi için gerekli olan bilgileri içeren bir DTO'dur
  @Transform(({ value }: { value: unknown }) =>        //refresh token'ının boşluklardan arındırılmış bir şekilde işlenmesini sağlar
    typeof value === "string" ? value.trim() : value  //Bu, token'ın yanlışlıkla başında veya sonunda boşluklarla gönderilmesi durumunda sorun yaşanmasını önler
  )
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
