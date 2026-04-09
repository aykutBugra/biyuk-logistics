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
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className={`appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`.trim()}
        {...inputProps}
      />
    </div>
  );
}
