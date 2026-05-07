"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TurkeyCityOption } from "@/lib/turkey-cities";
import { getTurkeyCityLabel } from "@/lib/turkey-cities";

type CitySelectFieldProps = {
  id: string;
  label: string;
  options: TurkeyCityOption[];
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export default function CitySelectField({
  id,
  label,
  options,
  placeholder,
  value,
  onChange,
}: CitySelectFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const selectedLabel = getTurkeyCityLabel(value);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setSearchQuery("");
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      normalizeSearchText(option.label).includes(normalizedQuery)
    );
  }, [options, searchQuery]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setSearchQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative space-y-1">
      <label className="text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        onClick={() =>
          setIsOpen((currentValue) => {
            const nextValue = !currentValue;

            if (!nextValue) {
              setSearchQuery("");
            }

            return nextValue;
          })
        }
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedLabel ? "text-slate-900" : "text-slate-400"}>
          {selectedLabel || placeholder}
        </span>
        <span className="text-xs font-semibold text-slate-500">
          {isOpen ? "Kapat" : "Seç"}
        </span>
      </button>

      {isOpen ? (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="space-y-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="81 il içinde ara"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{filteredOptions.length} sonuç</span>
              {value ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="font-semibold text-blue-700 transition hover:text-blue-800"
                >
                  Seçimi temizle
                </button>
              ) : null}
            </div>
          </div>

          <div
            role="listbox"
            aria-label={label}
            className="mt-3 max-h-64 space-y-1 overflow-y-auto"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected ? (
                      <span className="text-xs font-semibold">Seçili</span>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                Eşleşen il bulunamadı.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
