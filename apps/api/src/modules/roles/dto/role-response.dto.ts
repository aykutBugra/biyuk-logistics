import type {
  BusinessRoleName,
  RoleName,
} from "../../../common/constants/role-names";

export class RoleResponseDto {
  roles!: RoleName[];
  businessRoles!: BusinessRoleName[];
  isAdmin!: boolean;
}
