export function StatCard({
  label,
  value,
  large,
  gold,
}: {
  label: string;
  value: string | number;
  large?: boolean;
  gold?: boolean;
}) {
  return (
    <div className={`card p-5 ${gold ? "border-gold/30" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-2 tabular font-bold text-navy ${large ? "text-[28px] md:text-[32px]" : "text-2xl"}`}>{value}</p>
      {gold ? <span className="mt-3 block h-1 w-10 rounded-full bg-gold" /> : null}
    </div>
  );
}
