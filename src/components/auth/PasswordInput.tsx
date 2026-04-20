"use client";

import { useId, useState } from "react";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
};

export function PasswordInput({
  id: extId,
  label,
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  required,
  disabled,
  onKeyDown,
}: Props) {
  const gen = useId();
  const id = extId ?? gen;
  const [show, setShow] = useState(false);

  return (
    <label className="block text-sm font-medium text-[#1A1A1A]" htmlFor={id}>
      <span className="mb-1.5 block">{label}</span>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className="w-full rounded-xl border border-[#E8E0D6] bg-white py-3 pl-3 pr-12 text-base text-[#1A1A1A] outline-none ring-[#C47A2B]/30 placeholder:text-[#A8A29E] focus:border-[#C47A2B] focus:ring-2"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6B6560] hover:bg-[#F5E6D0] hover:text-[#1A1A1A]"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 3l18 18M10.5 10.677a2 2 0 002.823 2.823M7.362 7.561C5.68 8.74 4.28 10.552 3 12c1.889 2.991 5.282 6 9 6 1.55 0 3.043-.523 4.395-1.35M12 6c4.008 0 6.701 3.009 9 6a15.13 15.13 0 01-1.082 1.395"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M2 12s3.636-6 10-6 10 6 10 6-3.636 6-10 6-10-6-10-6Z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}
