"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/EmptyState";
import { floorLabel, formatMoney } from "@/lib/format";

type Dash = {
  living: number;
  free: number;
  todayIncome: number;
  monthIncome: number;
  monthChart: { day: string; value: number }[];
  floors: { floor: number; rooms: number; beds: number; occupied: number; free: number; percent: number }[];
  genders: { gender: string; name: string; rooms: number; beds: number; occupied: number; free: number; percent: number }[];
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
  const lastDay = data.monthChart[data.monthChart.length - 1]?.day;

  return (
    <div>
      <div className="mgr-hero mb-4 lg:hidden">
        <p>ZiyoHotel</p>
        <strong>
          Xush kelibsiz,
          <br />
          Boshliq!
        </strong>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="stat-quiet">
          <p>
            <span className="lg:hidden">Bugungi tushum</span>
            <span className="hidden lg:inline">Bugun</span>
          </p>
          <strong className="text-lg sm:text-xl">{formatMoney(data.todayIncome)}</strong>
        </div>
        <div className="stat-quiet">
          <p>Oy davomida</p>
          <strong className="text-lg sm:text-xl">{formatMoney(data.monthIncome)}</strong>
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
          <div className="flex h-28 w-full items-end gap-px overflow-hidden sm:h-36 sm:gap-1">
            {data.monthChart.map((d) => {
              const showLabel = d.day === "1" || d.day === lastDay || Number(d.day) % 5 === 0;
              return (
                <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t-sm bg-navy/80"
                    style={{ height: `${(d.value / maxInc) * 100}%`, minHeight: d.value ? 3 : 1 }}
                  />
                  <span className={`mt-1 text-[9px] text-muted sm:text-[10px] ${showLabel ? "" : "max-lg:invisible"}`}>
                    {d.day}
                  </span>
                </div>
              );
            })}
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

      {data.floors?.length ? (
        <section className="mt-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted">Qavatlar bo‘yicha bandlik</h3>
          <div className="hidden overflow-x-auto lg:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Qavat</th>
                  <th>Xonalar</th>
                  <th>O‘rinlar</th>
                  <th>Band</th>
                  <th>Bo‘sh</th>
                  <th>Bandlik</th>
                </tr>
              </thead>
              <tbody>
                {data.floors.map((f) => (
                  <tr key={f.floor}>
                    <td>{floorLabel(f.floor)}</td>
                    <td>{f.rooms}</td>
                    <td>{f.beds}</td>
                    <td>{f.occupied}</td>
                    <td>{f.free}</td>
                    <td className="tabular">{f.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">
            {data.floors.map((f) => (
              <article key={f.floor} className="mgr-list-card">
                <p className="mb-2 font-semibold text-navy">{floorLabel(f.floor)}</p>
                <div className="mgr-kv">
                  <span>Xonalar</span>
                  <span>{f.rooms}</span>
                </div>
                <div className="mgr-kv">
                  <span>O‘rinlar</span>
                  <span>{f.beds}</span>
                </div>
                <div className="mgr-kv">
                  <span>Band</span>
                  <span>{f.occupied}</span>
                </div>
                <div className="mgr-kv">
                  <span>Bo‘sh</span>
                  <span>{f.free}</span>
                </div>
                <div className="mgr-kv">
                  <span>Bandlik</span>
                  <span className="tabular">{f.percent}%</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {data.genders?.length ? (
        <section className="mt-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted">
            Bollar va qizlar bo‘yicha bandlik
          </h3>
          <div className="hidden overflow-x-auto lg:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Jins</th>
                  <th>Xonalar</th>
                  <th>O‘rinlar</th>
                  <th>Band</th>
                  <th>Bo‘sh</th>
                  <th>Bandlik</th>
                </tr>
              </thead>
              <tbody>
                {data.genders.map((g) => (
                  <tr key={g.gender}>
                    <td>{g.name}</td>
                    <td>{g.rooms}</td>
                    <td>{g.beds}</td>
                    <td>{g.occupied}</td>
                    <td>{g.free}</td>
                    <td className="tabular">{g.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">
            {data.genders.map((g) => (
              <article key={g.gender} className="mgr-list-card">
                <p className="mb-2 font-semibold text-navy">{g.name}</p>
                <div className="mgr-kv">
                  <span>Xonalar</span>
                  <span>{g.rooms}</span>
                </div>
                <div className="mgr-kv">
                  <span>O‘rinlar</span>
                  <span>{g.beds}</span>
                </div>
                <div className="mgr-kv">
                  <span>Band</span>
                  <span>{g.occupied}</span>
                </div>
                <div className="mgr-kv">
                  <span>Bo‘sh</span>
                  <span>{g.free}</span>
                </div>
                <div className="mgr-kv">
                  <span>Bandlik</span>
                  <span className="tabular">{g.percent}%</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
