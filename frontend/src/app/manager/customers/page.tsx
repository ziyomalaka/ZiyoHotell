"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PaginationBar } from "@/components/PaginationBar";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, payStatusLabel, roomLabel, bedLabel, stayTypeLabel } from "@/lib/format";

type Row = {
  id: string;
  fullName: string;
  phone: string;
  room: string;
  bed: number | string;
  startDate: string | null;
  type: string;
  payStatus: string;
  status: string;
};

export default function ManagerCustomersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<{ total: number; rows: Row[] }>({ total: 0, rows: [] });
  const [stats, setStats] = useState({ living: 0, free: 0, occupied: 0 });

  useEffect(() => {
    const p = new URLSearchParams({ tab: "living", q, page: String(page), pageSize: String(pageSize) });
    api<{ total: number; rows: Row[] }>(`/api/v1/manager/customers?${p}`).then(setData);
  }, [q, page, pageSize]);

  useEffect(() => {
    api<{ living: number; free: number; occupied: number }>("/api/v1/manager/dashboard").then((d) =>
      setStats({ living: d.living, free: d.free, occupied: d.occupied }),
    );
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, pageSize]);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-quiet">
          <p>Hozir yashayotganlar</p>
          <strong>{stats.living}</strong>
        </div>
        <div className="stat-quiet">
          <p>Bo‘sh o‘rinlar</p>
          <strong>{stats.free}</strong>
        </div>
        <div className="stat-quiet">
          <p>Band o‘rinlar</p>
          <strong>{stats.occupied}</strong>
        </div>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="F.I.Sh. / telefon / xona"
        className="mt-4 w-full max-w-md"
      />
      <div className="mt-4 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>F.I.Sh.</th>
              <th>Telefon</th>
              <th>Xona</th>
              <th>O‘rin</th>
              <th>Kirish sanasi</th>
              <th>Kunlik/Oylik</th>
              <th>To‘lov holati</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.fullName}</td>
                <td>{r.phone}</td>
                <td>{roomLabel(r.room)}</td>
                <td>{bedLabel(r.bed)}</td>
                <td>{formatDate(r.startDate)}</td>
                <td>{r.type ? stayTypeLabel(r.type) : "—"}</td>
                <td>
                  <StatusBadge value={r.payStatus === "PAID" ? "PAID" : "UNPAID"} label={payStatusLabel(r.payStatus)} />
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
