"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FloorFilter } from "@/components/FloorFilter";
import { PaginationBar } from "@/components/PaginationBar";
import { StatusBadge } from "@/components/StatusBadge";
import { floorLabel, formatDate } from "@/lib/format";

type Stay = {
  id: string;
  startDate: string;
  status: string;
  customer: { fullName: string };
  room: { number: string; floor: number };
  bed: { number: number };
  createdBy: { fullName: string };
  checkLogs: { type: string; at: string }[];
};

export default function AdminStaysPage() {
  const [tab, setTab] = useState("living");
  const [q, setQ] = useState("");
  const [floor, setFloor] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; rows: Stay[] }>({ total: 0, rows: [] });
  useEffect(() => {
    const p = new URLSearchParams({ tab, q, page: String(page) });
    if (floor) p.set("floor", floor);
    api<{ total: number; rows: Stay[] }>(`/api/v1/admin/stays?${p}`).then(setData);
  }, [tab, q, page, floor]);
  useEffect(() => {
    setPage(1);
  }, [tab, q, floor]);
  return (
    <div>
      <h1 className="sr-only">Kirish / Chiqish nazorati</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["in-today", "Bugun kirganlar"],
          ["out-today", "Bugun chiqqanlar"],
          ["living", "Hozir yashayotganlar"],
          ["left", "Tarix"],
        ].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`chip ${tab === id  ? "chip-active" : ""}`}>
            {l}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mijoz / xona" className="rounded-lg border border-line bg-white px-3 py-2" />
        <FloorFilter
          scope="admin"
          value={floor}
          onChange={setFloor}
          className="rounded-lg border border-line bg-white px-3 py-2"
        />
      </div>
      <div className="mt-4 card overflow-x-auto">
        <table className="data-table">
          <thead className="bg-background text-left">
            <tr>
              {["Mijoz", "Qavat", "Xona", "Kirish", "Chiqish", "Holat", "Reception"].map((h) => (
                <th key={h} className="px-3 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const out = r.checkLogs.find((l) => l.type === "CHECK_OUT");
              return (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-3 py-3">{r.customer.fullName}</td>
                  <td className="px-3 py-3">{floorLabel(r.room.floor)}</td>
                  <td className="px-3 py-3">
                    {r.room.number}/{r.bed.number}
                  </td>
                  <td className="px-3 py-3">{formatDate(r.startDate)}</td>
                  <td className="px-3 py-3">{out ? formatDate(out.at) : "—"}</td>
                  <td className="px-3 py-3">
                    <StatusBadge value={r.status} label={r.status === "ACTIVE" ? "Yashamoqda" : "Chiqib ketgan"} />
                  </td>
                  <td className="px-3 py-3">{r.createdBy.fullName}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} pageSize={20} total={data.total} onPage={setPage} />
    </div>
  );
}
