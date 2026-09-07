"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FilterBar } from "@/components/FilterBar";
import { FloorFilter } from "@/components/FloorFilter";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { floorLabel, formatDate, formatMoney, payStatusLabel } from "@/lib/format";

type Pay = {
  id: string;
  amount: number;
  type: string;
  period: string;
  method: string;
  status: string;
  paidAt: string;
  customer: { fullName: string };
  stay: {
    totalAmount: number;
    paidAmount: number;
    room: { number: string; floor: number };
    bed: { number: number };
  };
  createdBy: { fullName: string };
};

export default function AdminPaymentsPage() {
  const [range, setRange] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [floor, setFloor] = useState("");
  const [data, setData] = useState<{ rows: Pay[]; debt: number }>({ rows: [], debt: 0 });
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function query() {
    const p = new URLSearchParams({ range, q, type, status });
    if (floor) p.set("floor", floor);
    return p;
  }

  useEffect(() => {
    const p = new URLSearchParams({ range, q, type, status });
    if (floor) p.set("floor", floor);
    api<{ rows: Pay[]; debt: number }>(`/api/v1/admin/payments?${p}`).then(setData);
  }, [range, q, type, status, floor]);

  async function cancel() {
    if (!cancelId) return;
    await api("/api/v1/admin/payments", { method: "POST", body: JSON.stringify({ id: cancelId, reason }) });
    setCancelId(null);
    setReason("");
    setData(await api(`/api/v1/admin/payments?${query()}`));
  }

  return (
    <div>
      <h1 className="sr-only">To‘lovlar nazorati</h1>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard gold label="JAMI QARZDORLIK" value={formatMoney(data.debt)} />
      </div>
      <FilterBar>
        {[["","Barchasi"],["today","Bugun"],["yesterday","Kecha"],["week","Hafta"],["month","Oy"],["lastMonth","Oldingi oy"]].map(([v,l]) => (
          <button key={v} onClick={() => setRange(v)} className={`chip ${range===v ? "chip-active" : ""}`}>{l}</button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidiruv..." className="min-w-[180px] flex-1" />
        <FloorFilter scope="admin" value={floor} onChange={setFloor} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tur</option>
          <option value="DAILY">Kunlik</option>
          <option value="MONTHLY">Oylik</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Holat</option>
          <option value="PAID">To‘langan</option>
          <option value="PARTIAL">Qisman</option>
          <option value="UNPAID">To‘lanmagan</option>
        </select>
      </FilterBar>
      <div className="mt-4 card overflow-x-auto">
        <table className="data-table">
          <thead className="bg-background text-left">
            <tr>{["Mijoz","Qavat","Xona","Tur","Davr","Kutilgan","To‘langan","Qarz","Usul","Sana","Holat","Kim",""].map((h)=><th key={h} className="px-3 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-3">{r.customer.fullName}</td>
                <td className="px-3 py-3">{floorLabel(r.stay.room.floor)}</td>
                <td className="px-3 py-3">{r.stay.room.number}/{r.stay.bed.number}</td>
                <td className="px-3 py-3">{r.type === "DAILY" ? "Kunlik" : "Oylik"}</td>
                <td className="px-3 py-3">{r.period}</td>
                <td className="px-3 py-3">{formatMoney(r.stay.totalAmount)}</td>
                <td className="px-3 py-3">{formatMoney(r.stay.paidAmount)}</td>
                <td className="px-3 py-3">{formatMoney(Math.max(0, r.stay.totalAmount - r.stay.paidAmount))}</td>
                <td className="px-3 py-3">{r.method}</td>
                <td className="px-3 py-3">{formatDate(r.paidAt)}</td>
                <td className="px-3 py-3"><StatusBadge value={r.status} label={payStatusLabel(r.status)} /></td>
                <td className="px-3 py-3">{r.createdBy.fullName}</td>
                <td className="px-3 py-3">{r.status !== "CANCELLED" ? <button className="text-red" onClick={() => setCancelId(r.id)}>Bekor</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cancelId ? (
        <div className="modal-backdrop">
          <div className="w-full max-w-md card p-6">
            <h3 className="text-xl font-semibold">To‘lovni bekor qilish</h3>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sabab" className="mt-4 w-full rounded-lg border border-line p-3" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setCancelId(null)} className="btn-secondary">Bekor qilish</button>
              <button disabled={!reason.trim()} onClick={cancel} className="btn-danger">Tasdiqlash</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
