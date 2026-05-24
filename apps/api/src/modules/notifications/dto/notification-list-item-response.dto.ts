export class NotificationListItemResponseDto {
  id!: string;
  tip!: string;
  baslik!: string;
  mesaj!: string;
  hedefUrl!: string | null;
  isRead!: boolean;
  okunmaTarihi!: Date | null;
  olusturmaTarihi!: Date;
}
