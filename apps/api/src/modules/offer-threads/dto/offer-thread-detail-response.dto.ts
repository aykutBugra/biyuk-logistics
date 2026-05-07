import { OfferThreadMessageResponseDto } from "./offer-thread-message-response.dto";

export class OfferThreadDetailResponseDto {
  id!: number;
  offerId!: number;
  requestId!: number;
  participantSide!: "customer" | "carrier";
  baslangicSehri!: string;
  varisSehri!: string;
  baslangicKonumMetni!: string | null;
  varisKonumMetni!: string | null;
  karsiTarafId!: number;
  karsiTarafAdSoyad!: string;
  karsiTarafKullaniciAdi!: string;
  fiyat!: number;
  durum!: string;
  isClosed!: boolean;
  closedAt!: Date | null;
  hasUnread!: boolean;
  unreadCount!: number;
  canSendMessage!: boolean;
  canSendCounterOffer!: boolean;
  canAcceptOffer!: boolean;
  canRejectOffer!: boolean;
  messages!: OfferThreadMessageResponseDto[];
}
