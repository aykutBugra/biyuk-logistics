// Yuk tipi secenekleri form select'leri ve kart etiketleri icin tek kaynaktan gelir.
export const CARGO_TYPE_OPTIONS = [
  { value: "GENEL", label: "Genel yuk" },
  { value: "PALETLI", label: "Paletli" },
  { value: "KOLI", label: "Koli" },
  { value: "MOBILYA", label: "Mobilya" },
  { value: "BEYAZ_ESYA", label: "Beyaz esya" },
  { value: "INSAAT_MALZEMESI", label: "Insaat malzemesi" },
  { value: "DIGER", label: "Diger" },
] as const;

// Arac kasa tipi etiketleri hem arac formlarinda hem detay kartlarinda kullanilir.
export const VEHICLE_BODY_TYPE_OPTIONS = [
  { value: "PANELVAN", label: "Panelvan" },
  { value: "KAPALI_KASA", label: "Kapali kasa" },
  { value: "ACIK_KASA", label: "Acik kasa" },
  { value: "TENTELI", label: "Tenteli" },
  { value: "FRIGORIFIK", label: "Frigorifik" },
  { value: "DORSE", label: "Dorse" },
  { value: "DIGER", label: "Diger" },
] as const;

// Option listelerinden hizli label lookup yapmak icin map objeleri uretilir.
const cargoTypeLabels = Object.fromEntries(
  CARGO_TYPE_OPTIONS.map((option) => [option.value, option.label])
) as Record<string, string>;

const vehicleBodyTypeLabels = Object.fromEntries(
  VEHICLE_BODY_TYPE_OPTIONS.map((option) => [option.value, option.label])
) as Record<string, string>;

// Backend enum degeri bilinmiyorsa ham deger gosterilir, bos ise "Belirtilmedi" yazar.
export function getCargoTypeLabel(value: string | null | undefined): string {
  if (!value) {
    return "Belirtilmedi";
  }

  return cargoTypeLabels[value] ?? value;
}

export function getVehicleBodyTypeLabel(
  value: string | null | undefined
): string {
  if (!value) {
    return "Belirtilmedi";
  }

  return vehicleBodyTypeLabels[value] ?? value;
}

// Konum metni varsa onu, yoksa sehir bilgisini kullanarak kartlarda okunur baslik verir.
export function formatLocationLabel(
  konumMetni: string | null | undefined,
  sehir: string
): string {
  return konumMetni?.trim() || sehir;
}

// Agirlik, hacim, mesafe ve sure formatlari tum dashboard kartlarinda ayni gorunsun diye merkezilesir.
export function formatWeightKg(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Belirtilmedi";
  }

  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(value)} kg`;
}

export function formatVolumeM3(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Belirtilmedi";
  }

  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(value)} m3`;
}

export function formatRouteDistanceKm(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Belirtilmedi";
  }

  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
  }).format(value / 1000)} km`;
}

export function formatRouteDuration(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Belirtilmedi";
  }

  const totalMinutes = Math.max(0, Math.round(value / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${totalMinutes} dk`;
  }

  if (minutes === 0) {
    return `${hours} sa`;
  }

  return `${hours} sa ${minutes} dk`;
}

export function formatDimensionsCm(values: {
  uzunlukCm?: number | null;
  genislikCm?: number | null;
  yukseklikCm?: number | null;
}): string {
  if (!values.uzunlukCm || !values.genislikCm || !values.yukseklikCm) {
    return "Belirtilmedi";
  }

  return `${values.uzunlukCm} x ${values.genislikCm} x ${values.yukseklikCm} cm`;
}

// Filtre objesinde en az bir anlamli deger var mi toolbar rozetleri icin kontrol eder.
export function hasActiveFilters(values: Record<string, unknown>): boolean {
  return Object.values(values).some((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return true;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return false;
  });
}
