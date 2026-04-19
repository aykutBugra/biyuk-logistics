export class IncomingOfferListItemResponseDto {
  id!: number;
  requestId!: number;
  carrierId!: number;
  carrierName!: string;
  carrierUsername!: string;
  aracId!: number | null;
  aracPlaka!: string | null;
  fiyat!: number;
  not!: string | null;
  durum!: string;
}
