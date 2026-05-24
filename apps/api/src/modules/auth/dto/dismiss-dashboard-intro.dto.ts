import { IsIn } from "class-validator";
import {
  DASHBOARD_INTRO_ROLES,
  type DashboardIntroRole,
} from "../../../common/types/dashboard-intro-role.type";

//DismissDashboardIntroDto, kullanıcıların dashboard tanıtımını kapatmak istediklerinde gönderdikleri 
//veriyi doğrulamak için kullanılan bir DTO'dur.
export class DismissDashboardIntroDto {
  @IsIn(DASHBOARD_INTRO_ROLES)
  role!: DashboardIntroRole;
}
