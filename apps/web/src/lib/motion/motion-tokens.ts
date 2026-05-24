// Animasyon sureleri tek yerden degisirse dashboard genelinde ayni ritim korunur.
export const MOTION_DURATIONS = {
  hover: 0.14,
  press: 0.12,
  validation: 0.14,
  quick: 0.18,
  base: 0.22,
  panel: 0.24,
  overlayEnter: 0.18,
  overlayExit: 0.12,
  toastEnter: 0.16,
  toastExit: 0.12,
} as const;

// GSAP easing isimleri hook'larda string dagilmasin diye token olarak tutulur.
export const MOTION_EASES = {
  standard: "power2.out",
} as const;

// Hareket mesafeleri kucuk tutulur; operasyon ekranlari sarsici animasyon yapmaz.
export const MOTION_DISTANCES = {
  routeRevealY: 6,
  surfaceRevealY: 8,
  childRevealY: 4,
  overlayRevealY: 6,
  toastRevealY: 6,
  hoverLiftY: -2,
  pressLiftY: -1,
  sidebarTextX: -4,
} as const;

// Liste ve kart reveal animasyonlarinin araliklari burada merkezilesir.
export const MOTION_STAGGERS = {
  sections: 0.04,
  formSections: 0.035,
  cards: 0.03,
  cardsTight: 0.02,
} as const;

// Sidebar acik/kapali genislikleri animasyon ve layout tarafinda ayni degeri kullanir.
export const MOTION_LAYOUT = {
  sidebarExpandedWidth: 288,
  sidebarCollapsedWidth: 80,
} as const;
