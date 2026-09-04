export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-navy">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function BarTrack({
  label,
  value,
  total,
  tone = "blue",
}: {
  label: string;
  value: number;
  total: number;
  tone?: "blue" | "gold" | "navy" | "success" | "warning" | "danger" | "muted";
}) {
  const colors = {
    blue: "bg-royal",
    gold: "bg-gold",
    navy: "bg-navy",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    muted: "bg-muted",
  };
  return (
    <div className="mt-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular font-medium">{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background">
        <div
          className={`h-full rounded-full ${colors[tone]}`}
          style={{ width: `${Math.round((value / Math.max(total, 1)) * 100)}%` }}
        />
      </div>
    </div>
  );
}
