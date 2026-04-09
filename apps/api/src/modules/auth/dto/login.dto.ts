import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class LoginDto {                               //LoginDto, kullanıcı giriş işlemi için gerekli 
  @Transform(({ value }: { value: unknown }) =>       //olan bilgileri içeren bir DTO'dur
    typeof value === "string" ? value.trim() : value  //Giriş sırasında kullanılan identifier                                    
  )                                                   // (örneğin, kullanıcı adı veya e-posta) alanını tanımlar    
  @IsString()
  @IsNotEmpty()       //bu alanın boş olmamasını sağlar
  @MaxLength(100)     //Bu alanın maksimum uzunluğunu 100 karakter olarak sınırlar
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password!: string;
}
