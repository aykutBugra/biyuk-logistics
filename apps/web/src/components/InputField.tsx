import type { InputHTMLAttributes } from "react";

type InputFieldProps = {
  label: string;
  invalid?: boolean;
  validationMessage?: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export default function InputField({
  label,
  type = "text",
  placeholder,
  required = true,
  className = "",
  id,
  name,
  invalid = false,
  validationMessage,
  hint,
  ...inputProps
}: InputFieldProps) {
  const inputId = id ?? name;
  const messageId =
    inputId && (validationMessage || hint) ? `${inputId}-field-message` : undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={messageId}
        className={`app-input appearance-none text-base sm:text-sm ${className}`.trim()}
        {...inputProps}
      />
      {validationMessage || hint ? (
        <p
          id={messageId}
          className={validationMessage ? "app-field-status app-field-error" : "app-field-status app-field-hint"}
        >
          {validationMessage ?? hint}
        </p>
      ) : null}
    </div>
  );
}
