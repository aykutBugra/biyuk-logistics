//users module'ünün DTO'su. Kullanıcı profili bilgilerini döndürmek için kullanılır.
import type {
  BusinessRoleName,
  RoleName,
} from "../../../common/constants/role-names";


//burada sifrehash yok çünkü bu endpoint kullanıcı profili bilgilerini döndürürken 
//şifre bilgisini frontende gönderilirse güvenlik açığı oluşurdu . 
export class UserProfileResponseDto {
  id!: string;
  ad!: string;
  soyad!: string;
  mail!: string;
  kullaniciAdi!: string;
  telefonNumarasi!: string | null;
  profileImageUrl?: string;
  customerIntroDismissedAt!: Date | null;
  carrierIntroDismissedAt!: Date | null;
  roles!: RoleName[];
  businessRoles!: BusinessRoleName[];
  isAdmin!: boolean;
}
