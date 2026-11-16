import type { StoredDashboardWorkspaceMode } from "@/lib/auth/auth-storage";
import type { NotificationListItem } from "@/lib/api/notifications";

// Display names only. Persisted roles, workspace values and URLs stay unchanged.
export const WORKSPACE_LABELS: Record<StoredDashboardWorkspaceMode, string> = {
  customer: "Talep Paneli",
  carrier: "Nakliye Paneli",
};

export const REGISTRATION_OPTIONS = {
  MUSTERI: {
    label: "Talep Oluşturacağım",
    description: "Taşıma talebi oluştur, nakliyecilerden teklif al ve taşımanı yönet.",
  },
  NAKLIYECI: {
    label: "Her İkisini Yapacağım",
    description: "Hem taşıma talebi oluştur hem de nakliye hizmeti ver.",
  },
} as const;

const LEGACY_ACCOUNT_ERROR_CODES: Record<string, string> = {
  "Mail is already in use.": "AUTH_EMAIL_IN_USE",
  "Mail zaten kullanımda.": "AUTH_EMAIL_IN_USE",
  "Username is already in use.": "AUTH_USERNAME_IN_USE",
  "Username zaten kullanımda.": "AUTH_USERNAME_IN_USE",
  "Vehicle plate is already in use.": "AUTH_PLATE_IN_USE",
  "Plaka zaten kullanımda.": "AUTH_PLATE_IN_USE",
  "Invalid credentials.": "AUTH_INVALID_CREDENTIALS",
  "Sifre hatali": "AUTH_INVALID_CREDENTIALS",
};

type DisplayError = { message: string; body?: string };

export function getAccountErrorCode(error: DisplayError): string | undefined {
  if (error.body) {
    try {
      const payload: unknown = JSON.parse(error.body);
      if (payload && typeof payload === "object" && "code" in payload && typeof payload.code === "string") {
        return payload.code;
      }
    } catch {
      // Older API responses may not contain JSON or an application error code.
    }
  }
  return Object.hasOwn(LEGACY_ACCOUNT_ERROR_CODES, error.message)
    ? LEGACY_ACCOUNT_ERROR_CODES[error.message]
    : undefined;
}

export function formatAccountError(error: DisplayError): string {
  switch (getAccountErrorCode(error)) {
    case "AUTH_EMAIL_IN_USE":
      return "Bu e-posta ile zaten bir hesabınız var. Giriş yaparak Profil ekranından nakliye hizmetini etkinleştirebilirsiniz.";
    case "AUTH_USERNAME_IN_USE":
    case "AUTH_DISPLAY_NAME_IN_USE":
      return "Bu kullanıcı adı zaten kullanılıyor. Lütfen farklı bir kullanıcı adı seçin.";
    case "AUTH_PLATE_IN_USE":
      return "Bu plaka zaten aktif bir araca ait.";
    case "AUTH_INVALID_CREDENTIALS":
      return "E-posta, kullanıcı adı veya şifre hatalı. Bilgilerinizi kontrol edin.";
    default:
      if (error.message === "Carrier onboarding is already complete." || error.message === "Kişi zaten nakliyeci rolüne sahip.") {
        return "Nakliye Paneli zaten etkin. Araçlarınızı panelden yönetebilirsiniz.";
      }
      if (error.message === "Müşteri değilse nakliyeci olamaz.") {
        return "Nakliye Panelini etkinleştirmek için talep yetkisine sahip bir hesap gerekir.";
      }
      return error.message;
  }
}

// Recognize only application-generated notification templates. Never rewrite
// arbitrary messages, cargo descriptions or route/user names.
export function getNotificationCopy(notification: Pick<NotificationListItem, "tip" | "baslik" | "mesaj">) {
  const type = notification.tip.trim().toUpperCase();
  let title = notification.baslik;
  let message = notification.mesaj;
  const templates: Record<string, { titles: Record<string, string>; messages?: Record<string, string>; suffixes?: Record<string, string> }> = {
    TEKLIF_KABUL_EDILDI: {
      titles: { "Teklifin kabul edildi": "Teklifiniz kabul edildi" },
      messages: { "Teklifin kabul edildi ve nakliye kaydi olusturuldu.": "Teklifiniz kabul edildi ve taşıma kaydı oluşturuldu." },
    },
    IS_BASLADI: {
      titles: { "Nakliye basladi": "Taşıma başladı" },
      suffixes: { " icin nakliye baslatildi.": " için taşıma başlatıldı." },
    },
    IS_TAMAMLANDI: {
      titles: { "Nakliye tamamlandi": "Taşıma tamamlandı", "Teslimat onaylandi": "Teslimat onaylandı" },
      suffixes: {
        " icin nakliye tamamlandi.": " için taşıma tamamlandı.",
        " icin teslimat musteri tarafindan onaylandi.": " için teslimat talep sahibi tarafından onaylandı.",
      },
    },
    RATING_BEKLIYOR: {
      titles: { "Musteriyi puanlaman bekleniyor": "Talep sahibini değerlendirmeniz bekleniyor" },
      messages: { "Tamamlanan nakliye icin musteri deneyimini degerlendirebilirsin.": "Tamamlanan taşıma için talep sahibini değerlendirebilirsiniz." },
    },
  };
  const template = Object.hasOwn(templates, type) ? templates[type] : undefined;
  if (template) {
    title = Object.hasOwn(template.titles, title) ? template.titles[title] : title;
    message = template.messages && Object.hasOwn(template.messages, message) ? template.messages[message] : message;
    for (const [suffix, replacement] of Object.entries(template.suffixes ?? {})) {
      if (message.endsWith(suffix)) {
        message = message.slice(0, -suffix.length) + replacement;
        break;
      }
    }
  }
  return { title, message };
}
