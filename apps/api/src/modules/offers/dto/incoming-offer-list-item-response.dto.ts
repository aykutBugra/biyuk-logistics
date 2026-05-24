export class IncomingOfferListItemResponseDto {
  id!: string;
  requestId!: string;
  carrierId!: string;
  carrierName!: string;
  carrierUsername!: string;
  carrierProfileImageUrl?: string;
  aracId!: string | null;
  aracPlaka!: string | null;
  fiyat!: number;
  not!: string | null;
  durum!: string;
}
