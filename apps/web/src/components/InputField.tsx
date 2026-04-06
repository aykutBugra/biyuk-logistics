import type { InputHTMLAttributes } from "react";

type InputFieldProps = {
  label: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

export default function InputField({ label, id, ...props }: InputFieldProps) {
  const inputId = id ?? props.name;

  return (
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium tracking-wide text-slate-700"
      >
        {label}
      </label>
      <input
        id={inputId}
        {...props}
        className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      />
    </div>
  );
}
