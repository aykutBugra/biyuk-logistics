export class OfferThreadMessageResponseDto {
  id!: number;
  type!: string;
  text!: string | null;
  teklifFiyati!: number | null;
  systemEventCode!: string | null;
  createdAt!: Date;
  senderUserId!: number | null;
  senderName!: string | null;
  senderUsername!: string | null;
  senderProfileImageUrl?: string;
  isMine!: boolean;
}
