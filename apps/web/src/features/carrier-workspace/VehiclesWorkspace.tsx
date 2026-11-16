"use client";

import Image from "next/image";
import { useState } from "react";
import type { VehicleCardModel } from "@/components/VehicleCard";
import { Badge, Button, EmptyState, LinkButton } from "@/components/ui";
import { FilterBar, type LoadState, NoFilterResults, Panel } from "@/features/customer-workspace/shared";
import { CarrierFeedback, CarrierMetrics, carrierText, carrierTone, type SummaryItem } from "./shared";
import styles from "./workspace.module.css";

type VehicleFilter = "all" | "available" | "reserved" | "single-trip" | "missing-data";
function vehicleGroup(vehicle: VehicleCardModel): VehicleFilter {
  switch (vehicle.durumEtiketi) {
    case "Musait": return "available";
    case "Rezerve": return "reserved";
    case "Tek tasima": return "single-trip";
    case "Eksik bilgi": return "missing-data";
    default: return "all";
  }
}

export default function VehiclesWorkspace({
  vehicles, metrics, deletingVehicleId, onDelete, isLoading, errorMessage,
}: LoadState & {
  vehicles: VehicleCardModel[]; metrics: SummaryItem[]; deletingVehicleId: string | null; onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VehicleFilter>("all");
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  const visible = vehicles.filter((vehicle) => (filter === "all" || vehicleGroup(vehicle) === filter) &&
    (!needle || [vehicle.plaka, vehicle.baslik, ...vehicle.chipler.map((chip) => chip.label)].join(" ").toLocaleLowerCase("tr-TR").includes(needle)));
  if (isLoading || errorMessage) return <CarrierFeedback isLoading={isLoading} errorMessage={errorMessage} label="Araçlar yükleniyor…" />;
  const filters: Array<{ id: VehicleFilter; label: string }> = [
    { id: "all", label: "Tümü" }, { id: "available", label: "Müsait" }, { id: "reserved", label: "Rezerve" },
    { id: "single-trip", label: "Tek taşıma" }, { id: "missing-data", label: "Eksik bilgi" },
  ];
  return (
    <div className={[styles.workspace, styles.compact].join(" ")}>
      <CarrierMetrics items={metrics} />
      <Panel className={styles.listPanel} title="Filo kayıtları" description="Araçlarınızın tanımlı kapasitesini ve mevcut rezervasyonlarını takip edin.">
        <FilterBar filters={filters} selected={filter} onSelect={setFilter} query={query} onQueryChange={setQuery} searchLabel="Araçlarda ara" placeholder="Plaka, marka, model veya araç türü ara…" />
        <div className={styles.listMeta}><span>{visible.length} / {vehicles.length} araç</span></div>
        {!vehicles.length ? <EmptyState icon="pi pi-truck" title="Henüz araç yok" description="İlk aracınızı eklediğinizde kapasite ve rezervasyon bilgileri burada görünecek." action={<LinkButton href="/dashboard/arac_ekle" variant="primary">İlk aracı ekle</LinkButton>} />
        : !visible.length ? <NoFilterResults onReset={() => { setQuery(""); setFilter("all"); }} />
        : <div className={styles.list}>{visible.map((vehicle) => {
          const usage = Number.isFinite(vehicle.kullanimOrani) ? Math.max(0, Math.round(vehicle.kullanimOrani)) : null;
          const capacityLabel = vehicle.uyariMesaji ? "Yaklaşık kullanım" : "Kapasite kullanımı";
          return (
            <article key={vehicle.id} data-dashboard-card className={styles.vehicleRow} aria-busy={deletingVehicleId === vehicle.id || undefined}>
              <div className={styles.vehicleTop}>
                <div className={styles.vehicleImage}>{vehicle.imageUrl ? <Image src={vehicle.imageUrl} alt={carrierText(vehicle.baslik) + " fotoğrafı"} width={160} height={110} sizes="100px" unoptimized /> : <i className="pi pi-truck" aria-hidden="true" />}</div>
                <div className={styles.vehicleIdentity}>
                  <div className={styles.badges}><span className={styles.plate}>{carrierText(vehicle.plaka)}</span><Badge tone={carrierTone(vehicle.durumTonu)}>{carrierText(vehicle.durumEtiketi)}</Badge></div>
                  <h3>{carrierText(vehicle.baslik, "Araç")}</h3>
                  <div className={styles.facts}>{vehicle.chipler.map((chip) => <span key={chip.label}>{carrierText(chip.label)}</span>)}</div>
                </div>
                <div className={styles.usage}>
                  <div><span>{capacityLabel}</span><strong>{usage === null ? "—" : "%" + usage}</strong></div>
                  <div className={styles.usageTrack} role="progressbar" aria-label={capacityLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={usage === null ? undefined : Math.min(100, usage)} aria-valuetext={usage === null ? "Hesaplanamadı" : "%" + usage}><span style={{ width: Math.min(100, usage ?? 0) + "%" }} /></div>
                </div>
              </div>
              <div className={styles.vehicleCapacity}>
                <dl>{vehicle.kapasiteOzeti.map((item) => <div key={item.label}><dt>{carrierText(item.label)}</dt><dd>{carrierText(item.value)}</dd></div>)}</dl>
                <div className={styles.reservations}>{vehicle.operasyonOzeti.slice(0, 2).map((item) => <p key={item.label}><span>{carrierText(item.label)}</span><strong>{carrierText(item.value)}</strong></p>)}</div>
              </div>
              {vehicle.uyariMesaji ? <p className={styles.warning}><i className="pi pi-info-circle" aria-hidden="true" />{carrierText(vehicle.uyariMesaji)}</p> : null}
              <footer className={styles.rowFooter}><span className={styles.updated}>Rezervasyon ve kapasite özeti</span><div className={styles.actions}>
                <Button variant="danger" disabled={deletingVehicleId !== null} loading={deletingVehicleId === vehicle.id} onClick={() => onDelete(vehicle.id)}>Sil</Button>
                <LinkButton href={vehicle.editHref} variant="ghost">Düzenle</LinkButton>
                <LinkButton href={vehicle.detailHref}>Araç detayı <i className="pi pi-arrow-up-right" aria-hidden="true" /></LinkButton>
              </div></footer>
            </article>
          );
        })}</div>}
      </Panel>
    </div>
  );
}
