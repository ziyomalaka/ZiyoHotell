"use client";

import { formatPassportId } from "@/lib/format";

export function IdNumberInput({
  value,
  onChange,
  className = "w-full uppercase",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(formatPassportId(e.target.value))}
      onKeyDown={(e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key.length !== 1) return;
        if (formatPassportId(value + e.key) === value) e.preventDefault();
      }}
      onPaste={(e) => {
        e.preventDefault();
        onChange(formatPassportId(e.clipboardData.getData("text")));
      }}
      maxLength={9}
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
      placeholder="AA1234567"
      className={className}
    />
  );
}
