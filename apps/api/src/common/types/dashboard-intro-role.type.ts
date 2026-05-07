export const DASHBOARD_INTRO_ROLES = ["customer", "carrier"] as const;

export type DashboardIntroRole = (typeof DASHBOARD_INTRO_ROLES)[number];
