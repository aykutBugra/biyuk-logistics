"use client";

import { Badge, Button, EmptyState, InlineNotice, LinkButton } from "@/components/ui";
import ProfileImageUploader from "@/components/ProfileImageUploader";
import type { StoredAuthUser } from "@/lib/auth/auth-storage";
import type { MyRatingSummary } from "@/lib/api/ratings";
import { displayText, LoadFeedback, type LoadState, Panel, RatingScore } from "./shared";
import styles from "./workspace.module.css";

export default function ProfileWorkspace({
  user, accessToken, isCustomer, isCarrier, isAdmin, summary,
  isDeletePanelOpen, deleteErrorMessage, isDeletingAccount, onOpenDelete, onCancelDelete, onDelete,
  isLoading, errorMessage,
}: LoadState & {
  user: StoredAuthUser | null; accessToken: string | null; isCustomer: boolean; isCarrier: boolean; isAdmin: boolean;
  summary: MyRatingSummary | null; isDeletePanelOpen: boolean; deleteErrorMessage: string | null; isDeletingAccount: boolean;
  onOpenDelete: () => void; onCancelDelete: () => void; onDelete: () => void;
}) {
  if (isLoading || errorMessage) return <LoadFeedback isLoading={isLoading} errorMessage={errorMessage} label="Profil yükleniyor…" />;
  if (!user) return <EmptyState title="Profil bilgileri alınamadı" description="Hesap bilgilerinizi yeniden görmek için sayfayı yenileyin." />;
  const fields = [
    { label: "Ad", value: user.ad }, { label: "Soyad", value: user.soyad },
    { label: "Kullanıcı adı", value: user.kullaniciAdi }, { label: "E-posta", value: user.mail },
    { label: "Telefon", value: user.telefonNumarasi || "Eklenmedi" },
  ];
  return (
    <div className={styles.workspace}>
      <div className={styles.profileGrid}>
        <Panel title="Hesap bilgileri" icon="pi pi-user" description="Kayıtlı bilgilerinizi görüntüleyin ve profil fotoğrafınızı yönetin.">
          {accessToken ? <ProfileImageUploader accessToken={accessToken} user={user} compact /> : null}
          <dl className={styles.accountFields}>{fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{displayText(field.value, "Belirtilmedi")}</dd></div>)}</dl>
        </Panel>
        <aside className={styles.profileAside}>
          <Panel title="Hesap rolleri" icon="pi pi-id-card">
            <div className={styles.asideContent}>
              <div className={styles.roleBadges}>
                {isCustomer ? <Badge tone="blue">Müşteri</Badge> : null}
                {isCarrier ? <Badge tone="neutral">Nakliyeci</Badge> : null}
                {isAdmin ? <Badge tone="neutral">Yönetici</Badge> : null}
              </div>
              {isCustomer && !isCarrier ? <>
                <p>İlk aracınızı kaydederek mevcut hesabınıza nakliyeci rolünü de ekleyebilirsiniz.</p>
                <LinkButton href="/dashboard/profil/nakliyeci-rolu-ekle">Nakliyeci rolü ekle <i className="pi pi-arrow-up-right" aria-hidden="true" /></LinkButton>
              </> : <p>Müşteri ve nakliyeci alanları arasında sol menüdeki rol seçicisiyle geçiş yapabilirsiniz.</p>}
            </div>
          </Panel>
          {summary ? <Panel title="Değerlendirme özeti" icon="pi pi-star" action={<LinkButton href="/dashboard/puanlarim" variant="ghost">Tümünü gör <i className="pi pi-arrow-up-right" aria-hidden="true" /></LinkButton>}>
            <div className={styles.asideContent}>
              <div className={styles.profileRating}><div><strong>Müşteri olarak</strong><span>{summary.asCustomer.ratingCount} değerlendirme</span></div><RatingScore value={summary.asCustomer.averageRating} /></div>
              {isCarrier ? <div className={styles.profileRating}><div><strong>Nakliyeci olarak</strong><span>{summary.asCarrier.ratingCount} değerlendirme</span></div><RatingScore value={summary.asCarrier.averageRating} /></div> : null}
              {!summary.asCustomer.ratingCount && (!isCarrier || !summary.asCarrier.ratingCount) ? <p>Taşımalar tamamlanıp puan geldikçe profil özetiniz burada oluşacak.</p> : null}
            </div>
          </Panel> : null}
        </aside>
      </div>
      <Panel title="Hesap işlemleri" className={styles.dangerPanel} description="Hesap silme işlemi geri alınamaz. Aktif işlemler silmeyi engelleyebilir.">
        <div className={styles.dangerContent}>
          {!isDeletePanelOpen ? (
            <div className={styles.dangerIntro}><p>Hesabınızı ve ilişkili kayıtları kalıcı olarak silme işlemini başlatın.</p>
              <Button variant="danger" onClick={onOpenDelete}>Hesabımı sil</Button></div>
          ) : (
            <div className={styles.deleteConfirmation} role="region" aria-labelledby="delete-account-confirm-title">
              <h3 id="delete-account-confirm-title">Hesabınızı kalıcı olarak silmek istediğinize emin misiniz?</h3>
              <p>Bu işlem geri alınamaz. Hesabınıza bağlı araç, rota ve istek kayıtları kaldırılabilir. Silme sonrasında oturumunuz kapanır. Aktif nakliye, anlaşma veya açık teklif varsa işlem engellenebilir.</p>
              {deleteErrorMessage ? <InlineNotice tone="red" title="Hesap silinemedi">{displayText(deleteErrorMessage).replace("Hesap silinirken beklenmeyen bir hata olustu.", "Hesap silinirken beklenmeyen bir hata oluştu.")}</InlineNotice> : null}
              <div className={styles.confirmActions}>
                <Button onClick={onCancelDelete} disabled={isDeletingAccount} autoFocus>Vazgeç</Button>
                <Button className={styles.destructiveConfirm} onClick={onDelete} loading={isDeletingAccount}>{isDeletingAccount ? "Hesap siliniyor…" : "Silmeyi onayla"}</Button>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
