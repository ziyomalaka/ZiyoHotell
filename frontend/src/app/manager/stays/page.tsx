"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PaginationBar } from "@/components/PaginationBar";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatTime, roomBedLabel } from "@/lib/format";

type Row = {
  id: string;
  fullName: string;
  room: string;
  bed: number;
  inAt: string;
  outAt: string | null;
  status: string;
  reception: string;
};

export default function ManagerStaysPage() {
  const [tab, setTab] = useState("living");
  const [range, setRange] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<{ total: number; stats: { inToday: number; outToday: number; living: number }; rows: Row[] }>({
    total: 0,
    stats: { inToday: 0, outToday: 0, living: 0 },
    rows: [],
  });

  useEffect(() => {
    const p = new URLSearchParams({ tab, range, q, from, to, page: String(page), pageSize: String(pageSize) });
    api<{ total: number; stats: { inToday: number; outToday: number; living: number }; rows: Row[] }>(`/api/v1/manager/check-history?${p}`).then(setData);
  }, [tab, range, q, from, to, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [tab, range, q, from, to, pageSize]);

  return (
    <div>
      <h1 className="sr-only">Kirish / Chiqish nazorati</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="BUGUN KIRDI" value={data.stats.inToday} />
        <StatCard label="BUGUN CHIQDI" value={data.stats.outToday} />
        <StatCard label="HOZIR YASHAYDI" value={data.stats.living} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["in", "Bugun kirganlar"],
          ["out", "Bugun chiqqanlar"],
          ["living", "Hozir yashayotganlar"],
          ["all", "To‘liq tarix"],
        ].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`chip ${tab === id  ? "chip-active" : ""}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          ["", "Davr"],
          ["today", "Bugun"],
          ["yesterday", "Kecha"],
          ["week", "Shu hafta"],
          ["month", "Shu oy"],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setRange(v)} className={`chip ${range === v  ? "chip-active" : ""}`}>
            {l}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="F.I.Sh. / telefon / xona" className="rounded-lg border border-line bg-white px-3 py-2" />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2" />
      </div>
      <div className="mt-4 card overflow-x-auto">
        <table className="data-table">
          <thead className="bg-background text-left">
            <tr>
              {["F.I.Sh.", "Xona/o‘rin", "Kirish sanasi", "Kirish vaqti", "Chiqish sanasi", "Chiqish vaqti", "Holati", "Reception"].map((h) => (
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
                <td className="px-3 py-3">
                  {roomBedLabel(r.room, r.bed)}
                </td>
                <td className="px-3 py-3">{formatDate(r.inAt)}</td>
                <td className="px-3 py-3">{formatTime(r.inAt)}</td>
                <td className="px-3 py-3">{formatDate(r.outAt)}</td>
                <td className="px-3 py-3">{r.outAt ? formatTime(r.outAt) : "—"}</td>
                <td className="px-3 py-3">
                  <StatusBadge value={r.status} label={r.status === "ACTIVE" ? "Yashamoqda" : "Chiqib ketgan"} />
                </td>
                <td className="px-3 py-3">{r.reception}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} pageSize={pageSize} total={data.total} onPage={setPage} onPageSize={setPageSize} />
    </div>
  );
}
