"use client";

import type { ChangeEvent, ReactNode } from "react";
import InputField from "@/components/InputField";
import { VEHICLE_BODY_TYPE_OPTIONS } from "@/lib/logistics";
import type { VehicleFormState } from "@/lib/vehicles/vehicle-form";

type VehicleFormFieldsProps = {
  values: VehicleFormState;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  disabled?: boolean;
  sectionTitle?: string;
  sectionHint?: string;
  layoutVariant?: "default" | "operational";
};

function VehicleFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-950">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function VehicleFormFields({
  values,
  onChange,
  disabled = false,
  sectionTitle,
  sectionHint,
  layoutVariant = "default",
}: VehicleFormFieldsProps) {
  if (layoutVariant === "operational") {
    return (
      <div className="space-y-5">
        <VehicleFormSection title="Temel bilgiler" description="Arac kimligi ve filo listesinde gorunecek ana bilgiler.">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              name="marka"
              label="Marka"
              type="text"
              placeholder="Orn: Mercedes"
              value={values.marka}
              onChange={onChange}
              disabled={disabled}
            />
            <InputField
              name="model"
              label="Model"
              type="text"
              placeholder="Orn: Actros"
              value={values.model}
              onChange={onChange}
              disabled={disabled}
            />
            <InputField
              name="plaka"
              label="Plaka No"
              type="text"
              placeholder="34 ABC 123"
              value={values.plaka}
              onChange={onChange}
              disabled={disabled}
            />
            <InputField
              name="yil"
              label="Yil"
              type="number"
              min="1900"
              max={`${new Date().getFullYear() + 1}`}
              placeholder="Orn: 2020"
              value={values.yil}
              onChange={onChange}
              disabled={disabled}
            />
          </div>
        </VehicleFormSection>

        <VehicleFormSection title="Kapasite" description="Teklif planlamasinda kullanilacak yuk kapasitesi.">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              name="maksimumAgirlikKg"
              label="Maksimum Agirlik (kg)"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Orn: 18000"
              value={values.maksimumAgirlikKg}
              onChange={onChange}
              disabled={disabled}
            />
            <InputField
              name="maksimumHacimM3"
              label="Maksimum Hacim (m3)"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Orn: 45"
              value={values.maksimumHacimM3}
              onChange={onChange}
              disabled={disabled}
            />
          </div>
        </VehicleFormSection>

        <VehicleFormSection title="Kasa ve yukleme olculeri" description="Kasa tipi ve varsa ic yukleme alani olculeri.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="kasaTipi">
                Kasa Tipi
              </label>
              <select
                id="kasaTipi"
                name="kasaTipi"
                value={values.kasaTipi}
                onChange={onChange}
                disabled={disabled}
                className="app-input block text-sm"
              >
                {VEHICLE_BODY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 md:col-span-2">
              <InputField
                name="uzunlukCm"
                label="Uzunluk (cm)"
                type="number"
                min="1"
                value={values.uzunlukCm}
                onChange={onChange}
                disabled={disabled}
                required={false}
              />
              <InputField
                name="genislikCm"
                label="Genislik (cm)"
                type="number"
                min="1"
                value={values.genislikCm}
                onChange={onChange}
                disabled={disabled}
                required={false}
              />
              <InputField
                name="yukseklikCm"
                label="Yukseklik (cm)"
                type="number"
                min="1"
                value={values.yukseklikCm}
                onChange={onChange}
                disabled={disabled}
                required={false}
              />
            </div>
          </div>
        </VehicleFormSection>

        {sectionHint ? (
          <p className="text-sm leading-6 text-slate-500">{sectionHint}</p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {sectionTitle ? (
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-50 px-3 font-semibold tracking-wider text-slate-500">
              {sectionTitle}
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <InputField
          name="marka"
          label="Marka"
          type="text"
          placeholder="Orn: Mercedes"
          value={values.marka}
          onChange={onChange}
          disabled={disabled}
        />
        <InputField
          name="model"
          label="Model"
          type="text"
          placeholder="Orn: Actros"
          value={values.model}
          onChange={onChange}
          disabled={disabled}
        />
        <InputField
          name="yil"
          label="Yil"
          type="number"
          min="1900"
          max={`${new Date().getFullYear() + 1}`}
          placeholder="Orn: 2020"
          value={values.yil}
          onChange={onChange}
          disabled={disabled}
        />
        <InputField
          name="plaka"
          label="Plaka No"
          type="text"
          placeholder="34 ABC 123"
          value={values.plaka}
          onChange={onChange}
          disabled={disabled}
        />
        <InputField
          name="maksimumAgirlikKg"
          label="Maksimum Agirlik (kg)"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Orn: 18000"
          value={values.maksimumAgirlikKg}
          onChange={onChange}
          disabled={disabled}
        />
        <InputField
          name="maksimumHacimM3"
          label="Maksimum Hacim (m3)"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Orn: 45"
          value={values.maksimumHacimM3}
          onChange={onChange}
          disabled={disabled}
        />

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="kasaTipi">
            Kasa Tipi
          </label>
          <select
            id="kasaTipi"
            name="kasaTipi"
            value={values.kasaTipi}
            onChange={onChange}
            disabled={disabled}
            className="app-input block text-sm"
          >
            {VEHICLE_BODY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
          <InputField
            name="uzunlukCm"
            label="Uzunluk (cm)"
            type="number"
            min="1"
            value={values.uzunlukCm}
            onChange={onChange}
            disabled={disabled}
            required={false}
          />
          <InputField
            name="genislikCm"
            label="Genislik (cm)"
            type="number"
            min="1"
            value={values.genislikCm}
            onChange={onChange}
            disabled={disabled}
            required={false}
          />
          <InputField
            name="yukseklikCm"
            label="Yukseklik (cm)"
            type="number"
            min="1"
            value={values.yukseklikCm}
            onChange={onChange}
            disabled={disabled}
            required={false}
          />
        </div>
      </div>

      {sectionHint ? <p className="text-sm leading-6 text-slate-500">{sectionHint}</p> : null}
    </>
  );
}
