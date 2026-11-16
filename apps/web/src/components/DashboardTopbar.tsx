"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import { clearStoredAuth, type StoredAuth, type StoredDashboardWorkspaceMode } from "@/lib/auth/auth-storage";
import styles from "./control-center.module.css";
type DashboardTopbarProps = {
  auth: StoredAuth | null | undefined;
  workspaceMode: StoredDashboardWorkspaceMode | null;
  onMenuToggle?: () => void; menuOpen?: boolean;
  notificationCount?: number;
};
export default function DashboardTopbar({ auth, onMenuToggle, menuOpen = false, notificationCount = 0 }: DashboardTopbarProps) {
  const router = useRouter();
  const displayName = auth?.user ? [auth.user.ad, auth.user.soyad].join(" ").trim() || auth.user.kullaniciAdi : null;
  const handleLogout = () => { clearStoredAuth(); router.replace("/login"); };
  return (
    <header className={styles.topbar}>
      <div className={styles.brandArea}>
        <button type="button" onClick={onMenuToggle} className={styles.menuToggle}
          aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"} aria-controls="dashboard-navigation" aria-expanded={menuOpen}>
          <i className="pi pi-bars" aria-hidden="true" />
        </button>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.brandMark}>B<span aria-hidden="true">.</span></span>
          <span>Bi&apos;yuk<small>CONTROL CENTER</small></span>
        </Link>
      </div>
      <p className={styles.topbarCaption}>Lojistik operasyonları</p>
      <div className={styles.accountArea}>
        {notificationCount !== undefined ? (
          <Link href="/dashboard/bildirimler" className={styles.notificationLink}
            aria-label={notificationCount > 0 ? `Bildirimler, ${notificationCount} okunmamış` : "Bildirimler"}>
            <i className="pi pi-bell" aria-hidden="true" />
            {notificationCount > 0 ? <span className={styles.notificationDot} aria-hidden="true" /> : null}
          </Link>
        ) : null}
        {displayName ? (
          <Link href="/dashboard/profil" className={styles.account} title={displayName}>
            <CustomerInitialsAvatar name={displayName} fallback={auth?.user?.kullaniciAdi}
              imageUrl={auth?.user?.profileImageUrl} size="xs" tone="blue" />
            <span>{displayName}</span><i className="pi pi-angle-down" aria-hidden="true" />
          </Link>
        ) : null}
        <button type="button" onClick={handleLogout} className={styles.logout} aria-label="Çıkış yap" title="Çıkış yap"><i className="pi pi-sign-out" aria-hidden="true" /></button>
      </div>
    </header>
  );
}
