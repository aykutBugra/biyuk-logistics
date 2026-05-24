import { OfferThreadMessageResponseDto } from "./offer-thread-message-response.dto";

export class OfferThreadShipmentResponseDto {
  id!: string;
  durum!: string;
  olusturmaTarihi!: Date;
  baslangicTarihi!: Date | null;
  teslimBildirimTarihi!: Date | null;
  teslimTarihi!: Date | null;
  planlananAlimTarihi!: string | null;
  tahminiTeslimTarihi!: string | null;
}

export class OfferThreadDetailResponseDto {
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
  planlananAlimTarihi!: string | null;
  tahminiTeslimTarihi!: string | null;
  durum!: string;
  isClosed!: boolean;
  closedAt!: Date | null;
  hasUnread!: boolean;
  unreadCount!: number;
  canSendMessage!: boolean;
  canSendCounterOffer!: boolean;
  canAcceptOffer!: boolean;
  canRejectOffer!: boolean;
  canMarkDelivered!: boolean;
  canConfirmDelivery!: boolean;
  lastPriceActorSide!: "customer" | "carrier";
  shipment!: OfferThreadShipmentResponseDto | null;
  messages!: OfferThreadMessageResponseDto[];
}
