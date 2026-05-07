import { IsIn } from "class-validator";
import {
  DASHBOARD_INTRO_ROLES,
  type DashboardIntroRole,
} from "../../../common/types/dashboard-intro-role.type";

export class DismissDashboardIntroDto {
  @IsIn(DASHBOARD_INTRO_ROLES)
  role!: DashboardIntroRole;
}
