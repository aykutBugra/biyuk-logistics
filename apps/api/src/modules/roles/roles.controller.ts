import { Controller, Get, UseGuards } from "@nestjs/common";
import { ROLE_NAMES } from "../../common/constants/role-names";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";        
import { RolesGuard } from "../../common/guards/roles.guard";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { RoleResponseDto } from "./dto/role-response.dto";
import { RolesService } from "./roles.service";

@Controller("roles")               //roles yolunu dinleyen bir denetleyici oluşturur
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get("me")                      //Kullanıcının rollerini almak için bir GET isteği tanımlar
  @UseGuards(JwtAuthGuard)
  getMyRoles(   
    @CurrentUser() currentUser: AuthenticatedUser 
  ): Promise<RoleResponseDto> {     
    return this.rolesService.getRolesForUser(currentUser.id); 
  }

  // Geçici bir yönetici koruması test uç noktası. Gerçek uygulama ihtiyaçlarına göre düzenlenmelidir.
  @Get("admin-probe")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE_NAMES.ADMIN)
  getAdminProbe() {   //Yönetici rolü gerektiren geçici bir test uç noktası tanımlar
    return {
      ok: true,
      note: "Temporary guard test endpoint.",
    };
  }
}
