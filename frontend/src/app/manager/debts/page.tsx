"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FloorFilter } from "@/components/FloorFilter";
import { PaginationBar } from "@/components/PaginationBar";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { dash, displayUzPhone, floorLabel, formatDate, formatMoney, payStatusLabel, roomLabel, bedLabel, stayTypeLabel } from "@/lib/format";

type Row = {
  n: number;
  id: string;
  fullName: string;
  phone: string;
  passportId?: string;
  room: string;
  floor: number | null;
  bed: number;
  type: string;
  totalAmount: number;
  paidAmount: number;
  debt: number;
  started: string;
  days: number;
  status: string;
};

export default function ManagerDebtsPage() {
  const [tab, setTab] = useState("all");
  const [age, setAge] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [floor, setFloor] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<{ total: number; totalDebt: number; rows: Row[] }>({ total: 0, totalDebt: 0, rows: [] });

  useEffect(() => {
    const p = new URLSearchParams({ tab, age, type, q, page: String(page), pageSize: String(pageSize), sort: "debt" });
    if (floor) p.set("floor", floor);
    api<{ total: number; totalDebt: number; rows: Row[] }>(`/api/v1/manager/debts?${p}`)
      .then(setData)
      .catch(() => setData({ total: 0, totalDebt: 0, rows: [] }));
  }, [tab, age, type, q, page, pageSize, floor]);

  useEffect(() => {
    setPage(1);
  }, [tab, age, type, q, pageSize, floor]);

  return (
    <div>
      <h1 className="sr-only">Qarzdorliklar</h1>
      <div className="mt-5">
        <StatCard large label="JAMI QARZDORLIK" value={formatMoney(data.totalDebt)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["all", "Barcha qarzdorlar"],
          ["partial", "Qisman to‘laganlar"],
          ["unpaid", "Umuman to‘lamaganlar"],
          ["daily", "Kunlik qarzdorlik"],
          ["monthly", "Oylik qarzdorlik"],
        ].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`chip ${tab === id  ? "chip-active" : ""}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="F.I.Sh. / telefon / ID / xona" className="rounded-lg border border-line bg-white px-3 py-2" />
        <select value={age} onChange={(e) => setAge(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2">
          <option value="">Muddat</option>
          <option value="today">Bugungi qarz</option>
          <option value="1-7">1–7 kun</option>
          <option value="8-30">8–30 kun</option>
          <option value="30+">30 kundan ortiq</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2">
          <option value="">Tur</option>
          <option value="DAILY">Kunlik</option>
          <option value="MONTHLY">Oylik</option>
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
              {["Mijoz", "Telefon", "ID raqami", "Qavat", "Xona", "O‘rin", "Tur", "To‘lanishi kerak", "To‘langan", "Qolgan qarz", "Boshlangan", "Kun", "Holat"].map((h) => (
                <th key={h} className="px-3 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-3">{r.fullName}</td>
                <td className="px-3 py-3">{displayUzPhone(r.phone)}</td>
                <td className="px-3 py-3">{dash(r.passportId)}</td>
                <td className="px-3 py-3">{floorLabel(r.floor)}</td>
                <td className="px-3 py-3">{roomLabel(r.room)}</td>
                <td className="px-3 py-3">{bedLabel(r.bed)}</td>
                <td className="px-3 py-3">{stayTypeLabel(r.type)}</td>
                <td className="px-3 py-3">{formatMoney(r.totalAmount)}</td>
                <td className="px-3 py-3">{formatMoney(r.paidAmount)}</td>
                <td className="px-3 py-3 text-red">{formatMoney(r.debt)}</td>
                <td className="px-3 py-3">{formatDate(r.started)}</td>
                <td className="px-3 py-3">{r.days}</td>
                <td className="px-3 py-3">
                  <StatusBadge value={r.status} label={payStatusLabel(r.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} pageSize={pageSize} total={data.total} onPage={setPage} onPageSize={setPageSize} />
    </div>
  );
}
