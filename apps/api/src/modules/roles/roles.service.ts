import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  BUSINESS_ROLE_VALUES,
  ROLE_NAMES,
  ROLE_VALUES,
  type BusinessRoleName,
  type RoleName,
} from "../../common/constants/role-names";
import { RoleResponseDto } from "./dto/role-response.dto";
import { RolesRepository } from "./repositories/roles.repository";
import { UsersRepository } from "../users/repositories/users.repository";

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly usersRepository: UsersRepository
  ) {}

  async getRolesForUser(userId: number): Promise<RoleResponseDto> {
    const roleNames = await this.rolesRepository.findRoleNamesByUserId(userId);

    return this.toRoleResponse(this.normalizeRoleNames(roleNames));
  }

  async addBusinessRoleToUser(
    userId: number,
    roleName: BusinessRoleName
  ): Promise<RoleResponseDto> {
    if (roleName === ROLE_NAMES.NAKLIYECI) {
      throw new ConflictException(
        "Carrier role must be added through profile onboarding."
      );
    }

    const user = await this.usersRepository.findActiveById(userId);

    if (!user) {
      throw new NotFoundException("Current user could not be resolved.");
    }

    const currentRoles = this.normalizeRoleNames(user.roleNames);

    if (currentRoles.includes(roleName)) {
      throw new ConflictException("Current user already has this business role.");
    }

    const roleId = await this.requireRoleId(roleName);

    try {
      await this.rolesRepository.createRoleAssignment(userId, roleId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Current user already has this business role.");
      }

      throw error;
    }

    const updatedRoleNames = await this.rolesRepository.findRoleNamesByUserId(userId);
    return this.toRoleResponse(this.normalizeRoleNames(updatedRoleNames));
  }

  async assignRoleToUserInTransaction(
    tx: Prisma.TransactionClient,
    userId: number,
    roleName: RoleName
  ): Promise<void> {
    const roleId = await this.requireRoleId(roleName);

    try {
      await this.rolesRepository.createRoleAssignmentInTransaction(tx, userId, roleId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Current user already has this business role.");
      }

      throw error;
    }
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
    const normalized = roleNames.map((roleName) => {
      const normalizedRoleName = roleName.trim().toUpperCase();

      // Support legacy bootstrap data that used "kullanici" before MUSTERI.
      if (normalizedRoleName === "KULLANICI") {
        return ROLE_NAMES.MUSTERI;
      }

      return normalizedRoleName;
    });
    const invalidRoleNames = normalized.filter(
      (roleName): roleName is string => !ROLE_VALUES.includes(roleName as RoleName)
    );

    if (invalidRoleNames.length > 0) {
      throw new InternalServerErrorException("Unsupported role configuration.");
    }

    return [...new Set(normalized)] as RoleName[];
  }

  private toRoleResponse(roleNames: RoleName[]): RoleResponseDto {
    return {
      roles: roleNames,
      businessRoles: BUSINESS_ROLE_VALUES.filter((roleName) =>
        roleNames.includes(roleName)
      ),
      isAdmin: roleNames.includes(ROLE_NAMES.ADMIN),
    };
  }
}
