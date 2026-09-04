"use client";

import { useEffect, useState } from "react";
import { api, downloadExcel } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { formatDate, formatMoney, roomBedLabel } from "@/lib/format";

export default function AdminReportsPage() {
  const [type, setType] = useState("customers");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Record<string, unknown> | unknown[] | null>(null);

  useEffect(() => {
    api<Record<string, unknown> | unknown[]>(`/api/v1/admin/reports?type=${type}&from=${from}&to=${to}`)
      .then(setData)
      .catch(() => setData(null));
  }, [type, from, to]);

  async function excel() {
    await downloadExcel(`/api/v1/admin/reports/export/excel?type=${type}&from=${from}&to=${to}`, `Yotoqxona_${type}.xlsx`);
  }

  const customers = data as {
    total?: number;
    arrived?: number;
    left?: number;
    living?: number;
    rows?: { customer: { fullName: string }; room: { number: string }; startDate: string; status: string }[];
  } | null;
  const payments = data as { daily?: number; monthly?: number; total?: number; paid?: number; partial?: number; unpaid?: number } | null;
  const occupancy = data as { rooms?: number; beds?: number; occupied?: number; free?: number; repair?: number; percent?: number; full?: number; partial?: number; empty?: number } | null;
  const staff = data as { rows?: { fullName: string; login: string; role: string; workStatus: string }[] } | null;
  const debt = data as { total?: number; rows?: { id?: string; fullName?: string; room?: string; bed?: number; debt: number }[] } | null;
  const history = Array.isArray(data)
    ? (data as { customer: { fullName: string }; stay: { room: { number: string }; bed: { number: number } }; type: string; at: string }[])
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="sr-only">Hisobotlar</h1>
        <button onClick={excel} className="btn-excel">
          Excelga chiqarish
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["customers", "Mijozlar"],
          ["payments", "To‘lovlar"],
          ["occupancy", "Xonalar"],
          ["staff", "Xodimlar"],
          ["debt", "Qarzdorlik"],
          ["check-history", "Kirish / chiqish"],
        ].map(([id, l]) => (
          <button key={id} onClick={() => setType(id)} className={`chip ${type === id  ? "chip-active" : ""}`}>
            {l}
          </button>
        ))}
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2" />
      </div>

      {type === "customers" && customers ? (
        <div className="mt-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="Jami" value={customers.total || 0} />
            <StatCard label="Kelganlar" value={customers.arrived || 0} />
            <StatCard label="Chiqib ketganlar" value={customers.left || 0} />
            <StatCard label="Yashayotganlar" value={customers.living || 0} />
          </div>
        </div>
      ) : null}
      {type === "payments" && payments ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Kunlik" value={formatMoney(payments.daily || 0)} />
          <StatCard label="Oylik" value={formatMoney(payments.monthly || 0)} />
          <StatCard label="Jami tushum" value={formatMoney(payments.total || 0)} />
          <StatCard label="To‘langan" value={formatMoney(payments.paid || 0)} />
          <StatCard label="Qisman" value={formatMoney(payments.partial || 0)} />
          <StatCard label="Qarzdorlik" value={formatMoney(payments.unpaid || 0)} />
        </div>
      ) : null}
      {type === "occupancy" && occupancy ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Xonalar" value={occupancy.rooms || 0} />
          <StatCard label="O‘rinlar" value={occupancy.beds || 0} />
          <StatCard label="Band" value={occupancy.occupied || 0} />
          <StatCard label="Bo‘sh" value={occupancy.free || 0} />
          <StatCard label="Qisman band" value={occupancy.partial || 0} />
          <StatCard label="To‘liq band" value={occupancy.full || 0} />
          <StatCard label="Bandlik foizi" value={`${occupancy.percent || 0}%`} />
        </div>
      ) : null}
      {type === "staff" ? (
        <div className="mt-4 card overflow-x-auto">
          <table className="data-table">
            <thead className="bg-background text-left">
              <tr>
                {["F.I.Sh.", "Login", "Rol", "Holat"].map((h) => (
                  <th key={h} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(staff?.rows || []).map((u) => (
                <tr key={u.login} className="border-t border-line">
                  <td className="px-3 py-3">{u.fullName}</td>
                  <td className="px-3 py-3">{u.login}</td>
                  <td className="px-3 py-3">{u.role}</td>
                  <td className="px-3 py-3">{u.workStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {type === "debt" ? (
        <div className="mt-5">
          <StatCard label="Jami qarzdorlik" value={formatMoney(debt?.total || 0)} />
          <div className="mt-4 card overflow-x-auto">
            <table className="data-table">
              <thead className="bg-background text-left">
                <tr>
                  {["Mijoz", "Xona", "Qarz"].map((h) => (
                    <th key={h} className="px-3 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(debt?.rows || []).map((r, i) => (
                  <tr key={r.id || i} className="border-t border-line">
                    <td className="px-3 py-3">{r.fullName || "—"}</td>
                    <td className="px-3 py-3">{roomBedLabel(r.room, r.bed)}</td>
                    <td className="px-3 py-3">{formatMoney(r.debt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {type === "check-history" ? (
        <div className="mt-4 card overflow-x-auto">
          <table className="data-table">
            <thead className="bg-background text-left">
              <tr>
                {["F.I.Sh.", "Xona", "Tur", "Sana"].map((h) => (
                  <th key={h} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-3 py-3">{r.customer.fullName}</td>
                  <td className="px-3 py-3">{r.stay.room.number}/{r.stay.bed.number}</td>
                  <td className="px-3 py-3">{r.type === "CHECK_IN" ? "Kirish" : "Chiqish"}</td>
                  <td className="px-3 py-3">{formatDate(r.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
