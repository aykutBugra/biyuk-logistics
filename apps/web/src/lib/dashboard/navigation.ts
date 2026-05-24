import {
  type StoredDashboardWorkspaceMode,
} from "@/lib/auth/auth-storage";

export type DashboardNavVisibility =
  | "customer"
  | "carrier"
  | "shared-business"
  | "shared-account"
  | "admin";

type DashboardNavMatcher =
  | {
      type: "exact";
      value: string;
    }
  | {
      type: "prefix";
      value: string;
    };

type DashboardNavEntry = {
  id: string;
  href: string;
  label: string;
  icon?: string;
  groupId: string;
  groupTitle: string;
  order: number;
  visibility: DashboardNavVisibility;
  matchers: DashboardNavMatcher[];
};

export type DashboardNavigationContext = {
  isCustomer: boolean;
  isCarrier: boolean;
  isAdmin: boolean;
  workspaceMode: StoredDashboardWorkspaceMode | null;
  pathname: string;
};

export type DashboardRenderedNavItem = {
  id: string;
  href: string;
  label: string;
  icon?: string;
  isActive: boolean;
};

export type DashboardRenderedNavGroup = {
  id: string;
  title: string;
  items: DashboardRenderedNavItem[];
};

type DashboardShellMeta = {
  panelEyebrow: string;
  panelTitle: string;
  panelDescription: string;
};

export type DashboardNavigationModel = {
  navGroups: DashboardRenderedNavGroup[];
  activeItem: DashboardRenderedNavItem | null;
  shellMeta: DashboardShellMeta;
};

// Sidebar'daki tum menu kayitlari burada tutulur; gorunurluk rol ve workspace'e gore filtrelenir.
const DASHBOARD_NAV_ENTRIES: DashboardNavEntry[] = [
  {
    id: "customer-overview",
    href: "/dashboard",
    label: "Genel Bakış",
    icon: "pi pi-home",
    groupId: "customer-workspace",
    groupTitle: "Müşteri alanı",
    order: 10,
    visibility: "customer",
    matchers: [{ type: "exact", value: "/dashboard" }],
  },
  {
    id: "customer-requests",
    href: "/dashboard/isteklerim",
    label: "İsteklerim",
    icon: "pi pi-list",
    groupId: "customer-workspace",
    groupTitle: "Müşteri alanı",
    order: 20,
    visibility: "customer",
    matchers: [
      { type: "prefix", value: "/dashboard/isteklerim" },
      { type: "prefix", value: "/dashboard/istek_ekle" },
    ],
  },
  {
    id: "customer-incoming-offers",
    href: "/dashboard/gelen_teklifler",
    label: "Gelen Teklifler",
    icon: "pi pi-inbox",
    groupId: "customer-workspace",
    groupTitle: "Müşteri alanı",
    order: 30,
    visibility: "customer",
    matchers: [{ type: "prefix", value: "/dashboard/gelen_teklifler" }],
  },
  {
    id: "carrier-overview",
    href: "/dashboard",
    label: "Genel Bakış",
    icon: "pi pi-home",
    groupId: "carrier-workspace",
    groupTitle: "Nakliyeci alanı",
    order: 10,
    visibility: "carrier",
    matchers: [{ type: "exact", value: "/dashboard" }],
  },
  {
    id: "carrier-open-requests",
    href: "/dashboard/acik_istekler",
    label: "Açık İstekler",
    icon: "pi pi-search",
    groupId: "carrier-workspace",
    groupTitle: "Nakliyeci alanı",
    order: 20,
    visibility: "carrier",
    matchers: [
      { type: "prefix", value: "/dashboard/acik_istekler" },
      { type: "prefix", value: "/dashboard/teklif_ver" },
    ],
  },
  {
    id: "carrier-offers",
    href: "/dashboard/tekliflerim",
    label: "Tekliflerim",
    icon: "pi pi-send",
    groupId: "carrier-workspace",
    groupTitle: "Nakliyeci alanı",
    order: 30,
    visibility: "carrier",
    matchers: [{ type: "prefix", value: "/dashboard/tekliflerim" }],
  },
  {
    id: "carrier-shipments",
    href: "/dashboard/nakliyelerim",
    label: "Nakliyelerim",
    icon: "pi pi-truck",
    groupId: "carrier-workspace",
    groupTitle: "Nakliyeci alanı",
    order: 40,
    visibility: "carrier",
    matchers: [{ type: "prefix", value: "/dashboard/nakliyelerim" }],
  },
  {
    id: "carrier-routes",
    href: "/dashboard/rotalarim",
    label: "Rotalarım",
    icon: "pi pi-map",
    groupId: "carrier-workspace",
    groupTitle: "Nakliyeci alanı",
    order: 50,
    visibility: "carrier",
    matchers: [{ type: "prefix", value: "/dashboard/rotalarim" }],
  },
  {
    id: "carrier-vehicles",
    href: "/dashboard/araclarim",
    label: "Araçlarım",
    icon: "pi pi-car",
    groupId: "carrier-workspace",
    groupTitle: "Nakliyeci alanı",
    order: 60,
    visibility: "carrier",
    matchers: [
      { type: "prefix", value: "/dashboard/araclarim" },
      { type: "prefix", value: "/dashboard/arac_ekle" },
    ],
  },
  {
    id: "shared-conversations",
    href: "/dashboard/konusmalar",
    label: "Konuşmalar",
    icon: "pi pi-comments",
    groupId: "shared-business",
    groupTitle: "Ortak işlemler",
    order: 10,
    visibility: "shared-business",
    matchers: [{ type: "prefix", value: "/dashboard/konusmalar" }],
  },
  {
    id: "shared-ratings",
    href: "/dashboard/puanlarim",
    label: "Puanlarım",
    icon: "pi pi-star",
    groupId: "shared-business",
    groupTitle: "Ortak işlemler",
    order: 20,
    visibility: "shared-business",
    matchers: [
      { type: "prefix", value: "/dashboard/puanlarim" },
      { type: "prefix", value: "/dashboard/paun_ver" },
    ],
  },
  {
    id: "account-notifications",
    href: "/dashboard/bildirimler",
    label: "Bildirimler",
    icon: "pi pi-bell",
    groupId: "shared-account",
    groupTitle: "Hesabım",
    order: 10,
    visibility: "shared-account",
    matchers: [{ type: "prefix", value: "/dashboard/bildirimler" }],
  },
  {
    id: "account-profile",
    href: "/dashboard/profil",
    label: "Profil",
    groupId: "shared-account",
    icon: "pi pi-user",
    groupTitle: "Hesabım",
    order: 20,
    visibility: "shared-account",
    matchers: [{ type: "prefix", value: "/dashboard/profil" }],
  },
  {
    id: "admin-overview",
    href: "/dashboard/admin",
    label: "Admin genel bakış",
    icon: "pi pi-shield",
    groupId: "admin",
    groupTitle: "Yönetim",
    order: 10,
    visibility: "admin",
    matchers: [{ type: "exact", value: "/dashboard/admin" }],
  },
  {
    id: "admin-users",
    href: "/dashboard/admin/kullanicilar",
    label: "Kullanıcılar",
    icon: "pi pi-users",
    groupId: "admin",
    groupTitle: "Yönetim",
    order: 20,
    visibility: "admin",
    matchers: [{ type: "prefix", value: "/dashboard/admin/kullanicilar" }],
  },
];

// Exact ve prefix matcher'lar aktif sayfayi bulmak icin tek yerden cozulur.
function isMatcherMatch(pathname: string, matcher: DashboardNavMatcher): boolean {
  if (matcher.type === "exact") {
    return pathname === matcher.value;
  }

  return pathname === matcher.value || pathname.startsWith(`${matcher.value}/`);
}

// Daha uzun veya exact match, sidebar'da daha dogru aktif item secilmesini saglar.
function getMatcherScore(matcher: DashboardNavMatcher): number {
  if (matcher.type === "exact") {
    return 1000 + matcher.value.length;
  }

  return matcher.value.length;
}

// Menu item'i kullanicinin aktif rol/alanina gore gosterilebilir mi kontrol eder.
function isEntryVisible(
  entry: DashboardNavEntry,
  context: DashboardNavigationContext
): boolean {
  switch (entry.visibility) {
    case "customer":
      return context.workspaceMode === "customer" && context.isCustomer;
    case "carrier":
      return context.workspaceMode === "carrier" && context.isCarrier;
    case "shared-business":
      return context.isCustomer || context.isCarrier;
    case "shared-account":
      return context.isCustomer || context.isCarrier || context.isAdmin;
    case "admin":
      return context.isAdmin;
    default:
      return false;
  }
}

// Sidebar panelinin ust metinleri aktif workspace'e gore degisir.
function buildShellMeta(
  context: DashboardNavigationContext,
  pathname: string
): DashboardShellMeta {
  if (pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/")) {
    return {
      panelEyebrow: "Yönetim",
      panelTitle: "Yönetim alanı",
      panelDescription:
        "Yönetim araçları ve kullanıcı görünürlüğü burada toplanır.",
    };
  }

  if (context.workspaceMode === "carrier") {
    return {
      panelEyebrow: "Çalışma alanı",
      panelTitle: "Nakliyeci alanı",
      panelDescription:
        "Keşif, teklif ve taşıma akışını buradan yönet.",
    };
  }

  if (context.workspaceMode === "customer") {
    return {
      panelEyebrow: "Çalışma alanı",
      panelTitle: "Müşteri alanı",
      panelDescription:
        "Taleplerini ve teklif sürecini buradan yönet.",
    };
  }

  return {
    panelEyebrow: context.isAdmin ? "Yönetim" : "Hesap",
    panelTitle: context.isAdmin ? "Yönetim alanı" : "Panelim",
    panelDescription:
      "Rolüne uygun alanlar ve ortak hesap yüzeyleri burada toplanır.",
  };
}

// Layout'un kullanacagi gruplu navigation modeli ve aktif item burada uretilir.
export function buildDashboardNavigation(
  context: DashboardNavigationContext
): DashboardNavigationModel {
  const visibleEntries = DASHBOARD_NAV_ENTRIES.filter((entry) =>
    isEntryVisible(entry, context)
  );

  // Birden fazla prefix eslesirse en spesifik olan aktif sayilir.
  let activeEntry: DashboardNavEntry | null = null;
  let activeEntryScore = -1;

  for (const entry of visibleEntries) {
    for (const matcher of entry.matchers) {
      if (!isMatcherMatch(context.pathname, matcher)) {
        continue;
      }

      const score = getMatcherScore(matcher);
      if (score > activeEntryScore) {
        activeEntry = entry;
        activeEntryScore = score;
      }
    }
  }

  const groupMap = new Map<string, DashboardRenderedNavGroup>();

  // Sirali menu kayitlari groupId'ye gore sidebar bolumlerine ayrilir.
  for (const entry of visibleEntries.sort((left, right) => left.order - right.order)) {
    const group = groupMap.get(entry.groupId) ?? {
      id: entry.groupId,
      title: entry.groupTitle,
      items: [],
    };

    group.items.push({
      id: entry.id,
      href: entry.href,
      label: entry.label,
      icon: entry.icon,
      isActive: activeEntry?.id === entry.id,
    });

    groupMap.set(entry.groupId, group);
  }

  return {
    navGroups: Array.from(groupMap.values()),
    activeItem: activeEntry
      ? {
          id: activeEntry.id,
          href: activeEntry.href,
          label: activeEntry.label,
          icon: activeEntry.icon,
          isActive: true,
        }
      : null,
    shellMeta: buildShellMeta(context, context.pathname),
  };
}
