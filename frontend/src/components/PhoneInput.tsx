"use client";

import { formatUzPhone, maskUzPhone, uzPhoneLocal, UZ_PHONE_PREFIX } from "@/lib/format";

export function PhoneInput({
  value,
  onChange,
  className = "w-full",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const shown = maskUzPhone(value);
  const local = uzPhoneLocal(value);

  function keepPrefix(el: HTMLInputElement) {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start < UZ_PHONE_PREFIX.length || end < UZ_PHONE_PREFIX.length) {
      const pos = Math.max(UZ_PHONE_PREFIX.length + 1, end, shown.length);
      requestAnimationFrame(() => el.setSelectionRange(pos, pos));
    }
  }

  return (
    <input
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      value={shown}
      placeholder="+998 (50) 571-71-58"
      onChange={(e) => {
        const next = uzPhoneLocal(e.target.value);
        if (next.length === local.length && e.target.value.length < shown.length) {
          onChange(formatUzPhone(local.slice(0, -1)));
          return;
        }
        onChange(formatUzPhone(e.target.value));
      }}
      onKeyDown={(e) => {
        const start = e.currentTarget.selectionStart ?? 0;
        const end = e.currentTarget.selectionEnd ?? 0;
        if (e.key === "Backspace" && start <= UZ_PHONE_PREFIX.length + 1 && start === end) {
          e.preventDefault();
          return;
        }
        if (e.key === "Delete" && start < UZ_PHONE_PREFIX.length + 1) {
          e.preventDefault();
          return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault();
      }}
      onPaste={(e) => {
        e.preventDefault();
        onChange(formatUzPhone(e.clipboardData.getData("text")));
      }}
      onFocus={(e) => keepPrefix(e.currentTarget)}
      onClick={(e) => keepPrefix(e.currentTarget)}
      onSelect={(e) => keepPrefix(e.currentTarget)}
      maxLength={19}
      className={className}
    />
  );
}
