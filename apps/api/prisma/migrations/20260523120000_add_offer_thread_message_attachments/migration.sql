CREATE TABLE "OfferThreadMessageAttachment" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "thumbnailStorageKey" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "originalFileName" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferThreadMessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfferThreadMessageAttachment_messageId_sortOrder_idx"
  ON "OfferThreadMessageAttachment"("messageId", "sortOrder");

ALTER TABLE "OfferThreadMessageAttachment"
  ADD CONSTRAINT "OfferThreadMessageAttachment_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "OfferThreadMessage"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
