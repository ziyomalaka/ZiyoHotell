"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/EmptyState";
import { FloorFilter } from "@/components/FloorFilter";
import { PaginationBar } from "@/components/PaginationBar";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  checkoutDate,
  floorLabel,
  formatDate,
  formatMoney,
  formatTime,
  methodLabel,
  payStatusLabel,
  stayTypeLabel,
} from "@/lib/format";

type Pay = {
  id: string;
  amount: number;
  type: string;
  period: string;
  method: string;
  status: string;
  paidAt: string;
  customer: { fullName: string };
  coversTo?: string | null;
  stay: {
    totalAmount: number;
    paidAmount: number;
    paidUntil?: string | null;
    endDate?: string | null;
    status?: string;
    room: { number: string; floor: number };
    bed: { number: number };
  };
  createdBy: { fullName: string };
};

type Data = {
  total: number;
  rows: Pay[];
  todayIncome: number;
  todayCash?: number;
  todayCard?: number;
  monthIncome: number;
  monthCash?: number;
  monthCard?: number;
  totalIncome: number;
  cash?: number;
  card?: number;
  debt: number;
  paid: number;
  partial: number;
  unpaid: number;
};

export default function ManagerPaymentsPage() {
  const [range, setRange] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [floor, setFloor] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    const p = new URLSearchParams({ range, q, type, status, method, from, to, page: String(page), pageSize: String(pageSize) });
    if (floor) p.set("floor", floor);
    api<Data>(`/api/v1/manager/payments?${p}`).then(setData);
  }, [range, q, type, status, method, from, to, page, pageSize, floor]);

  useEffect(() => {
    setPage(1);
  }, [range, q, type, status, method, from, to, pageSize, floor]);

  if (!data) return <LoadingSkeleton />;

  return (
    <div>
      <h1 className="sr-only">To‘lovlar nazorati</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard gold label="BUGUNGI TUSHUM" value={formatMoney(data.todayIncome)} />
        <StatCard gold label="BUGUN NAQD" value={formatMoney(data.todayCash || 0)} />
        <StatCard gold label="BUGUN KARTA" value={formatMoney(data.todayCard || 0)} />
        <StatCard gold label="OYLIK TUSHUM" value={formatMoney(data.monthIncome)} />
        <StatCard gold label="OY NAQD" value={formatMoney(data.monthCash || 0)} />
        <StatCard gold label="OY KARTA" value={formatMoney(data.monthCard || 0)} />
        <StatCard gold label="JAMI TUSHUM" value={formatMoney(data.totalIncome)} />
        <StatCard gold label="JAMI NAQD" value={formatMoney(data.cash || 0)} />
        <StatCard gold label="JAMI KARTA" value={formatMoney(data.card || 0)} />
        <StatCard gold label="JAMI QARZDORLIK" value={formatMoney(data.debt)} />
        <StatCard label="TO‘LOV QILGANLAR" value={`${data.paid} ta`} />
        <StatCard label="QISMAN / TO‘LAMAGAN" value={`${data.partial} / ${data.unpaid}`} />
      </div>
      <div className="card mt-4 flex flex-wrap gap-2 p-3">
        {[
          ["", "Barchasi"],
          ["today", "Bugun"],
          ["yesterday", "Kecha"],
          ["week", "Shu hafta"],
          ["month", "Shu oy"],
          ["lastMonth", "Oldingi oy"],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setRange(v)} className={`chip ${range === v  ? "chip-active" : ""}`}>
            {l}
          </button>
        ))}
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mijoz / telefon / xona" className="rounded-lg border border-line bg-white px-3 py-2" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2">
          <option value="">Tur</option>
          <option value="DAILY">Kunlik</option>
          <option value="MONTHLY">Oylik</option>
        </select>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2">
          <option value="">Usul</option>
          <option value="CASH">Naqd</option>
          <option value="CARD">Karta</option>
          <option value="BANK">Bank</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2">
          <option value="">Holat</option>
          <option value="PAID">To‘lagan</option>
          <option value="PARTIAL">Qisman</option>
          <option value="UNPAID">To‘lamagan</option>
        </select>
        <FloorFilter
          scope="manager"
          value={floor}
          onChange={setFloor}
          className="rounded-lg border border-line bg-white px-3 py-2"
        />
      </div>
      <div className="mt-4 card overflow-x-auto">
        <table className="data-table">
          <thead className="bg-background text-left">
            <tr>
              {["Mijoz", "Qavat", "Xona/o‘rin", "Tur", "Davr", "Kutilgan", "To‘langan", "Qarz", "Usul", "Sana", "Chiqish kuni", "Vaqt", "Holat", "Reception"].map((h) => (
                <th key={h} className="px-3 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-3">{r.customer.fullName}</td>
                <td className="px-3 py-3">{floorLabel(r.stay.room.floor)}</td>
                <td className="px-3 py-3">
                  {r.stay.room.number}/{r.stay.bed.number}
                </td>
                <td className="px-3 py-3">{stayTypeLabel(r.type)}</td>
                <td className="px-3 py-3">{r.period}</td>
                <td className="px-3 py-3">{formatMoney(r.stay.totalAmount)}</td>
                <td className="px-3 py-3">{formatMoney(r.amount)}</td>
                <td className="px-3 py-3">{formatMoney(Math.max(0, r.stay.totalAmount - r.stay.paidAmount))}</td>
                <td className="px-3 py-3">{methodLabel(r.method)}</td>
                <td className="px-3 py-3">{formatDate(r.paidAt)}</td>
                <td className="px-3 py-3">{formatDate(r.coversTo || checkoutDate(r.stay))}</td>
                <td className="px-3 py-3">{formatTime(r.paidAt)}</td>
                <td className="px-3 py-3">
                  <StatusBadge value={r.status} label={payStatusLabel(r.status)} />
                </td>
                <td className="px-3 py-3">{r.createdBy.fullName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} pageSize={pageSize} total={data.total} onPage={setPage} onPageSize={setPageSize} />
    </div>
  );
}
