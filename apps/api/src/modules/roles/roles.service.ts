import { Injectable, InternalServerErrorException } from "@nestjs/common";
import {
  ROLE_VALUES,
  type RoleName,
} from "../../common/constants/role-names";
import { RoleResponseDto } from "./dto/role-response.dto";
import { RolesRepository } from "./repositories/roles.repository";

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async getRolesForUser(userId: number): Promise<RoleResponseDto> {
    const roleNames = await this.rolesRepository.findRoleNamesByUserId(userId);

    return {
      roles: this.normalizeRoleNames(roleNames),
    };
  }

  async requireRoleId(roleName: RoleName): Promise<number> {
    const role = await this.rolesRepository.findByRoleName(roleName);

    if (!role) {
      throw new InternalServerErrorException(
        `Registration role is not configured: ${roleName}.`
      );
    }

    return role.id;
  }

  normalizeRoleNames(roleNames: string[]): RoleName[] {
    const normalized = roleNames.map((roleName) => roleName.trim().toUpperCase());
    const invalidRoleNames = normalized.filter(
      (roleName): roleName is string => !ROLE_VALUES.includes(roleName as RoleName)
    );

    if (invalidRoleNames.length > 0) {
      throw new InternalServerErrorException("Unsupported role configuration.");
    }

    return [...new Set(normalized)] as RoleName[];
  }
}
