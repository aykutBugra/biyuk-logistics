export class OfferThreadMessageAttachmentResponseDto {
  id!: string;
  url!: string;
  thumbnailUrl!: string;
  mimeType!: string;
  sizeBytes!: number;
  width!: number;
  height!: number;
  originalFileName!: string;
  createdAt!: Date;
}

export class OfferThreadMessageResponseDto {
  id!: string;
  type!: string;
  text!: string | null;
  teklifFiyati!: number | null;
  systemEventCode!: string | null;
  createdAt!: Date;
  senderUserId!: string | null;
  senderName!: string | null;
  senderUsername!: string | null;
  senderProfileImageUrl?: string;
  isMine!: boolean;
  attachments!: OfferThreadMessageAttachmentResponseDto[];
}
