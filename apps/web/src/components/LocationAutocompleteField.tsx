"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ApiClientError } from "@/lib/api/api-client";
import {
  autocompleteLocations,
  getLocationPlaceDetails,
  type LocationSuggestion,
  type SelectedLocation,
} from "@/lib/api/locations";

type LocationAutocompleteFieldProps = {
  label: string;
  placeholder: string;
  accessToken: string;
  value: SelectedLocation | null;
  onSelect: (value: SelectedLocation | null) => void;
  disabled?: boolean;
  required?: boolean;
  legacyHint?: string | null;
  invalid?: boolean;
  validationMessage?: string | null;
  hint?: string | null;
};

function createSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function LocationAutocompleteField({
  label,
  placeholder,
  accessToken,
  value,
  onSelect,
  disabled = false,
  required = true,
  legacyHint,
  invalid = false,
  validationMessage,
  hint,
}: LocationAutocompleteFieldProps) {
  const inputId = useId();
  const [query, setQuery] = useState(value?.konumMetni ?? "");
  const [previousValue, setPreviousValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState(createSessionToken);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const messageId = `${inputId}-field-message`;
  const hasValidationError = invalid && Boolean(validationMessage);
  const helperMessage = errorMessage
    ? errorMessage
    : hasValidationError
      ? validationMessage
      : !value && legacyHint
        ? `Mevcut kayit: ${legacyHint}. Guncellemeden once yeni konumu listeden sec.`
        : hint;

  // Disaridan degisen secimi ayni render'da uygula; eski onerileri tasima.
  if (value !== previousValue) {
    setPreviousValue(value);
    setQuery(value?.konumMetni ?? "");
    setSuggestions([]);
    setIsLoading(false);
    setErrorMessage(null);
  }

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (disabled || !accessToken) {
      return;
    }

    const trimmed = query.trim();

    if (trimmed.length < 3 || trimmed === value?.konumMetni) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await autocompleteLocations(
          trimmed,
          accessToken,
          sessionToken
        );

        if (cancelled) {
          return;
        }

        setSuggestions(response);
        setIsOpen(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSuggestions([]);
        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Konum onerileri su anda getirilemiyor."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [accessToken, disabled, query, sessionToken, value?.konumMetni]);

  const handleSuggestionSelect = async (suggestion: LocationSuggestion) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const details = await getLocationPlaceDetails(
        suggestion.placeId,
        accessToken,
        sessionToken
      );

      onSelect({
        ...details,
        sessionToken,
      });
      setQuery(details.konumMetni);
      setSuggestions([]);
      setIsOpen(false);
      setSessionToken(createSessionToken());
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Secilen konum dogrulanamadi."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2" ref={rootRef}>
      <label className="block text-sm font-medium text-gray-700" htmlFor={inputId}>
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            setSuggestions([]);
            setIsLoading(false);
            setErrorMessage(null);
            setIsOpen(true);

            if (value && nextValue.trim() !== value.konumMetni) {
              // Secimi kaldirirken kullanicinin yazdigi yeni metni koru.
              setPreviousValue(null);
              onSelect(null);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          required={required && value === null}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={invalid || Boolean(errorMessage) || undefined}
          aria-describedby={helperMessage ? messageId : undefined}
          className="app-input block text-sm"
        />

        {isOpen && suggestions.length > 0 ? (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.provider}-${suggestion.placeId}`}
                type="button"
                onClick={() => void handleSuggestionSelect(suggestion)}
                className="flex w-full flex-col rounded-xl px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <span className="text-sm font-semibold text-slate-900">
                  {suggestion.primaryText}
                </span>
                <span className="text-xs text-slate-500">
                  {suggestion.secondaryText || suggestion.fullText}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-500">Konum onerileri yukleniyor...</p>
      ) : null}

      {value ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="font-semibold">{value.konumMetni}</p>
          <p className="mt-1 text-xs text-emerald-700">
            {value.ilce ? `${value.ilce}, ${value.sehir}` : value.sehir}
          </p>
        </div>
      ) : null}

      {helperMessage ? (
        <p
          id={messageId}
          className={
            errorMessage || hasValidationError
              ? "app-field-status app-field-error"
              : !value && legacyHint
                ? "app-field-status text-xs text-amber-700"
                : "app-field-status app-field-hint"
          }
        >
          {helperMessage}
        </p>
      ) : null}
    </div>
  );
}
