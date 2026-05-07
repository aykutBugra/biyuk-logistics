import { Transform } from "class-transformer";
import { IsIn, IsString, IsNotEmpty } from "class-validator";
import {
  BUSINESS_ROLE_VALUES,
  type BusinessRoleName,
} from "../../../common/constants/role-names";

export class AddBusinessRoleDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value
  )
  @IsString()
  @IsNotEmpty()
  @IsIn(BUSINESS_ROLE_VALUES)
  role!: BusinessRoleName;
}
