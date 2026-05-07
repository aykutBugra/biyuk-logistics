export class VehicleCapacitySummaryResponseDto {
  toplamAgirlikKg!: number;
  toplamHacimM3!: number | null;
  rezerveAgirlikKg!: number;
  rezerveHacimM3!: number;
  kalanAgirlikKg!: number;
  kalanHacimM3!: number | null;
  aktifRezervasyonSayisi!: number;
  aktifTekTasimaRezervasyonuVar!: boolean;
  hesapEksigiVar!: boolean;
}
