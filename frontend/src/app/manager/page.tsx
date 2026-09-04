"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/EmptyState";
import { formatMoney } from "@/lib/format";

type Dash = {
  living: number;
  free: number;
  todayIncome: number;
  monthIncome: number;
  monthChart: { day: string; value: number }[];
  recent: { at: string; text: string }[];
};

export default function ManagerHome() {
  const [data, setData] = useState<Dash | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Dash>("/api/v1/manager/dashboard")
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "Ma’lumotlarni yuklashda xatolik yuz berdi."));
  }, []);

  if (err) return <ErrorState text={err} />;
  if (!data) return <LoadingSkeleton />;
  const maxInc = Math.max(...data.monthChart.map((d) => d.value), 1);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-quiet">
          <p>Bugun</p>
          <strong className="text-xl">{formatMoney(data.todayIncome)}</strong>
        </div>
        <div className="stat-quiet">
          <p>Oy davomida</p>
          <strong className="text-xl">{formatMoney(data.monthIncome)}</strong>
        </div>
        <div className="stat-quiet">
          <p>Yashayotganlar</p>
          <strong>{data.living}</strong>
        </div>
        <div className="stat-quiet">
          <p>Bo‘sh o‘rin</p>
          <strong>{data.free}</strong>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted">Shu oy tushumi</h3>
          <div className="flex h-36 items-end gap-1">
            {data.monthChart.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center justify-end">
                <div
                  className="w-full bg-navy/80"
                  style={{ height: `${(d.value / maxInc) * 100}%`, minHeight: d.value ? 3 : 1 }}
                />
                <span className="mt-1 text-[10px] text-muted">{d.day}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted">Oxirgi to‘lovlar</h3>
          {data.recent.length ? (
            <ul className="space-y-2 text-sm text-navy">
              {data.recent.map((r, i) => (
                <li key={i} className="border-b border-line pb-2 last:border-0">
                  {r.text}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Bugun to‘lovlar mavjud emas." />
          )}
        </section>
      </div>
    </div>
  );
}
