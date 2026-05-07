"use client";

import type { ChangeEvent } from "react";
import InputField from "@/components/InputField";
import { VEHICLE_BODY_TYPE_OPTIONS } from "@/lib/logistics";
import type { VehicleFormState } from "@/lib/vehicles/vehicle-form";

type VehicleFormFieldsProps = {
  values: VehicleFormState;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  disabled?: boolean;
  sectionTitle?: string;
  sectionHint?: string;
};

export default function VehicleFormFields({
  values,
  onChange,
  disabled = false,
  sectionTitle,
  sectionHint,
}: VehicleFormFieldsProps) {
  return (
    <>
      {sectionTitle ? (
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white/90 px-3 font-semibold tracking-wider text-slate-500">
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

      {sectionHint ? <p className="text-sm text-slate-500">{sectionHint}</p> : null}
    </>
  );
}
