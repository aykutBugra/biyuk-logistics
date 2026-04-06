import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password!: string;
}
