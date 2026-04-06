import type { RoleName } from "../../../common/constants/role-names";

export class UserProfileResponseDto {
  id!: number;
  ad!: string;
  soyad!: string;
  mail!: string;
  kullaniciAdi!: string;
  telefonNumarasi!: string | null;
  roles!: RoleName[];
}
