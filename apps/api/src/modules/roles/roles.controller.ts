import { Controller, Get, UseGuards } from "@nestjs/common";
import { ROLE_NAMES } from "../../common/constants/role-names";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { RoleResponseDto } from "./dto/role-response.dto";
import { RolesService } from "./roles.service";

@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getMyRoles(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<RoleResponseDto> {
    return this.rolesService.getRolesForUser(currentUser.id);
  }

  // Temporary guard verification endpoint kept for manual learning/testing.
  @Get("admin-probe")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE_NAMES.ADMIN)
  getAdminProbe() {
    return {
      ok: true,
      note: "Temporary guard test endpoint.",
    };
  }
}
