import type { InputHTMLAttributes } from "react";

type InputFieldProps = {
  label: string;
} & InputHTMLAttributes<HTMLInputElement>;

export default function InputField({
  label,
  type = "text",
  placeholder,
  required = true,
  className = "",
  id,
  name,
  ...inputProps
}: InputFieldProps) {
  const inputId = id ?? name;

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
        className={`app-input appearance-none text-base sm:text-sm ${className}`.trim()}
        {...inputProps}
      />
    </div>
  );
}
