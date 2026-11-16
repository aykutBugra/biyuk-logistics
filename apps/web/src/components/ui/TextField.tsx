"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./ui.module.css";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
  hideLabel?: boolean;
};

export function TextField({
  id,
  label,
  hint,
  error,
  leadingIcon,
  hideLabel = false,
  className = "",
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = hint || error ? `${inputId}-message` : undefined;
  const describedBy = [props["aria-describedby"], messageId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={hideLabel ? styles.srOnly : styles.fieldLabel}>{label}</label>
      <div className={styles.inputWrapper}>
        {leadingIcon ? <span className={styles.inputIcon} aria-hidden="true">{leadingIcon}</span> : null}
        <input
          {...props}
          id={inputId}
          className={`${styles.input} ${leadingIcon ? styles.inputWithIcon : ""} ${className}`.trim()}
          aria-describedby={describedBy}
          aria-invalid={error ? true : props["aria-invalid"]}
        />
      </div>
      {hint || error ? (
        <p id={messageId} className={`${styles.fieldMessage} ${error ? styles.fieldError : ""}`}>{error ?? hint}</p>
      ) : null}
    </div>
  );
}
