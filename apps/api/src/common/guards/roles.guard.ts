import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AppErrorCode, AppErrors } from "../errors";
import { Reflector } from "@nestjs/core";
import type { RoleName } from "../constants/role-names";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { AuthenticatedUser } from "../types/authenticated-user.type";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const currentUser = request.user;

    if (!currentUser) {
      throw AppErrors.unauthorized(AppErrorCode.UNAUTHORIZED, "Authentication is required.");
    }

    const hasRequiredRole = requiredRoles.some((role) =>
      currentUser.roles.includes(role)
    );

    if (!hasRequiredRole) {
      throw AppErrors.forbidden(AppErrorCode.FORBIDDEN, "You do not have the required role.");
    }

    return true;
  }
}
