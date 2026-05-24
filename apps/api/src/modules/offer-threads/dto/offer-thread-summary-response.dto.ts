export class OfferThreadSummaryResponseDto {
  id!: string;
  offerId!: string;
  requestId!: string;
  participantSide!: "customer" | "carrier";
  baslangicSehri!: string;
  varisSehri!: string;
  baslangicKonumMetni!: string | null;
  varisKonumMetni!: string | null;
  karsiTarafId!: string;
  karsiTarafAdSoyad!: string;
  karsiTarafKullaniciAdi!: string;
  karsiTarafProfileImageUrl?: string;
  fiyat!: number;
  durum!: string;
  isClosed!: boolean;
  closedAt!: Date | null;
  hasUnread!: boolean;
  unreadCount!: number;
  lastMessageSummary!: string | null;
  lastMessageAt!: Date | null;
}
