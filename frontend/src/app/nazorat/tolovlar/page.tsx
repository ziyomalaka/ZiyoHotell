"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { PaginationBar } from "@/components/PaginationBar";
import { SectorFilter } from "@/components/SectorFilter";
import { useTodayISO } from "@/components/CurrentDate";
import { floorLabel, formatDate, formatMoney, methodLabel, payStatusLabel, stayTypeLabel } from "@/lib/format";

type Payment = {
  id: string;
  amount: number;
  method: string;
  status: string;
  type: string;
  paidAt: string;
  customer: { fullName: string };
  stay: { room: { number: string; floor: number }; bed: { number: number } };
  createdBy?: { fullName: string } | null;
};

type Data = {
  total: number;
  rows: Payment[];
  todayIncome?: number;
  todayCash?: number;
  todayCard?: number;
  todayTerminal?: number;
  monthIncome?: number;
};

export default function SupervisorPaymentsPage() {
  const today = useTodayISO();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sector, setSector] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data>({ total: 0, rows: [] });

  // Standart davr — bugun.
  const dateFrom = from || today;
  const dateTo = to || today;

  function load(nextPage = page) {
    if (!dateFrom) return;
    const p = new URLSearchParams({ page: String(nextPage), from: dateFrom, to: dateTo });
    if (sector) p.set("floor", sector);
    api<Data>(`/api/v1/reception/payments?${p}`).then(setData).catch(() => null);
  }
  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, sector]);

  const paidSum = data.rows.filter((r) => r.status === "PAID").reduce((a, r) => a + r.amount, 0);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="stat-quiet">
          <p>Bugungi tushum</p>
          <strong className="text-lg">{formatMoney(data.todayIncome || 0)}</strong>
        </div>
        <div className="stat-quiet">
          <p>Naqd</p>
          <strong className="text-lg">{formatMoney(data.todayCash || 0)}</strong>
        </div>
        <div className="stat-quiet">
          <p>Karta</p>
          <strong className="text-lg">{formatMoney(data.todayCard || 0)}</strong>
        </div>
        <div className="stat-quiet">
          <p>Terminal</p>
          <strong className="text-lg">{formatMoney(data.todayTerminal || 0)}</strong>
        </div>
        <div className="stat-quiet">
          <p>Shu oy</p>
          <strong className="text-lg">{formatMoney(data.monthIncome || 0)}</strong>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-sm">
          Dan <input type="date" value={dateFrom} onChange={(e) => setFrom(e.target.value)} className="ml-1" />
        </label>
        <label className="text-sm">
          Gacha <input type="date" value={dateTo} onChange={(e) => setTo(e.target.value)} className="ml-1" />
        </label>
        <SectorFilter scope="reception" value={sector} onChange={setSector} />
        <span className="text-sm text-muted">
          Tanlangan davrda: {data.total} ta to‘lov{data.rows.length ? ` · sahifada ${formatMoney(paidSum)}` : ""}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sana</th>
              <th>Mijoz</th>
              <th>Joy</th>
              <th>Summa</th>
              <th>To‘lov turi</th>
              <th>Yashash turi</th>
              <th>Holat</th>
              <th>Kim qabul qilgan</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{formatDate(r.paidAt)}</td>
                <td>{r.customer.fullName}</td>
                <td className="whitespace-nowrap">
                  {floorLabel(r.stay.room.floor)} · {r.stay.room.number}/{r.stay.bed.number}
                </td>
                <td className="tabular whitespace-nowrap font-medium">{formatMoney(r.amount)}</td>
                <td>{r.status === "PAID" ? methodLabel(r.method) : "—"}</td>
                <td>{stayTypeLabel(r.type)}</td>
                <td>{payStatusLabel(r.status)}</td>
                <td>{r.createdBy?.fullName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.rows.length ? <EmptyState className="mt-4" text="Tanlangan davrda to‘lov yo‘q." /> : null}
      <PaginationBar page={page} pageSize={20} total={data.total} onPage={(p) => { setPage(p); load(p); }} />
    </div>
  );
}
