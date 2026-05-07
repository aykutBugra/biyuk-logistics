export const MOTION_DURATIONS = {
  hover: 0.14,
  quick: 0.18,
  base: 0.22,
  panel: 0.24,
} as const;

export const MOTION_EASES = {
  standard: "power2.out",
} as const;

export const MOTION_DISTANCES = {
  surfaceRevealY: 8,
  childRevealY: 4,
  hoverLiftY: -2,
  sidebarTextX: -4,
} as const;

export const MOTION_STAGGERS = {
  sections: 0.04,
  cards: 0.03,
} as const;

export const MOTION_LAYOUT = {
  sidebarExpandedWidth: 288,
  sidebarCollapsedWidth: 80,
} as const;
