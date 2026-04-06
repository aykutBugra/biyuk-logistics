import type { RoleName } from "../constants/role-names";

export type AuthenticatedUser = {
  id: number;
  mail: string;
  kullaniciAdi: string;
  roles: RoleName[];
};
