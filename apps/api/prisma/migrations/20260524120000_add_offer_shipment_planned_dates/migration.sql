ALTER TABLE "Teklif"
ADD COLUMN "planlananAlimTarihi" TIMESTAMP(3),
ADD COLUMN "tahminiTeslimTarihi" TIMESTAMP(3);

ALTER TABLE "Nakliye"
ADD COLUMN "planlananAlimTarihi" TIMESTAMP(3),
ADD COLUMN "tahminiTeslimTarihi" TIMESTAMP(3);

ALTER TABLE "Teklif"
ADD CONSTRAINT "Teklif_tahminiTeslimTarihi_not_before_planlananAlimTarihi_check"
CHECK (
  "tahminiTeslimTarihi" IS NULL
  OR "planlananAlimTarihi" IS NULL
  OR "tahminiTeslimTarihi" >= "planlananAlimTarihi"
);

ALTER TABLE "Nakliye"
ADD CONSTRAINT "Nakliye_tahminiTeslimTarihi_not_before_planlananAlimTarihi_check"
CHECK (
  "tahminiTeslimTarihi" IS NULL
  OR "planlananAlimTarihi" IS NULL
  OR "tahminiTeslimTarihi" >= "planlananAlimTarihi"
);
