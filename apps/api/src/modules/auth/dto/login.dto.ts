import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password!: string;
}
