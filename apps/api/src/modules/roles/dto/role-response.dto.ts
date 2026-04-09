import type { RoleName } from "../../../common/constants/role-names";

export class RoleResponseDto {    //RoleResponseDto, bir kullanıcının rollerini temsil eden bir DTO'dur
  roles!: RoleName[];
}
