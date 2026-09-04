const map: Record<string, string> = {
  empty: "bg-[#e8f4ec] text-[#2d6a45]",
  PAID: "bg-[#e8f4ec] text-[#2d6a45]",
  ACTIVE: "bg-[#e8f4ec] text-[#2d6a45]",
  partial: "bg-[#eef3f8] text-navy",
  PARTIAL: "bg-[#f8ecec] text-[#9b3b3b]",
  full: "bg-[#e8eef6] text-navy",
  UNPAID: "bg-[#f8ecec] text-[#9b3b3b]",
  inactive: "bg-[#f0f0f0] text-muted",
  COMPLETED: "bg-[#f0f0f0] text-muted",
  CANCELLED: "bg-[#f0f0f0] text-muted",
  REPAIR: "bg-[#f0f0f0] text-muted",
  repair: "bg-[#f0f0f0] text-muted",
  INACTIVE: "bg-[#f0f0f0] text-muted",
  BLOCKED: "bg-[#f8ecec] text-[#9b3b3b]",
};

export function StatusBadge({ value, label }: { value: string; label: string }) {
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${map[value] || "bg-[#f0f0f0] text-navy"}`}>
      {label}
    </span>
  );
}
