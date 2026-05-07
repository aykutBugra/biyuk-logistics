//users module'ünün DTO'su. Kullanıcı profili bilgilerini döndürmek için kullanılır.
import type {
  BusinessRoleName,
  RoleName,
} from "../../../common/constants/role-names";

export class UserProfileResponseDto {
  id!: number;
  ad!: string;
  soyad!: string;
  mail!: string;
  kullaniciAdi!: string;
  telefonNumarasi!: string | null;
  customerIntroDismissedAt!: Date | null;
  carrierIntroDismissedAt!: Date | null;
  roles!: RoleName[];
  businessRoles!: BusinessRoleName[];
  isAdmin!: boolean;
}
