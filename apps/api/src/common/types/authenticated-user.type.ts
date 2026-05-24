import type { RoleName } from "../constants/role-names";

export type AuthenticatedUser = {
  id: number;
  publicId: string;
  mail: string;
  kullaniciAdi: string;
  roles: RoleName[];
};
