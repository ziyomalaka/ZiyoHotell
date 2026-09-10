"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { FloorFilter } from "@/components/FloorFilter";
import { PaginationBar } from "@/components/PaginationBar";
import { StatusBadge } from "@/components/StatusBadge";
import {
  customerGenderLabel,
  dash,
  displayUzPhone,
  floorLabel,
  formatDate,
  payStatusLabel,
  roomLabel,
  bedLabel,
  stayTypeLabel,
} from "@/lib/format";

type Row = {
  id: string;
  fullName: string;
  phone: string;
  passportId?: string;
  gender: string;
  room: string;
  floor: number | null;
  bed: number | string;
  startDate: string | null;
  type: string;
  payStatus: string;
  status: string;
};

export default function ManagerCustomersPage() {
  const [q, setQ] = useState("");
  const [floor, setFloor] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<{ total: number; rows: Row[] }>({ total: 0, rows: [] });
  const [stats, setStats] = useState({ living: 0, free: 0, occupied: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams({ tab: "living", q, page: String(page), pageSize: String(pageSize) });
    if (floor) p.set("floor", floor);
    api<{ total: number; rows: Row[] }>(`/api/v1/manager/customers?${p}`).then((next) => {
      setData(next);
      setReady(true);
    });
  }, [q, page, pageSize, floor]);

  useEffect(() => {
    api<{ living: number; free: number; occupied: number }>("/api/v1/manager/dashboard").then((d) =>
      setStats({ living: d.living, free: d.free, occupied: d.occupied }),
    );
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, pageSize, floor]);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        <div className="stat-quiet px-2 py-3 sm:px-4">
          <p className="leading-tight">Hozir yashayotganlar</p>
          <strong className="text-lg sm:text-[1.45rem]">{stats.living}</strong>
        </div>
        <div className="stat-quiet px-2 py-3 sm:px-4">
          <p className="leading-tight">Bo‘sh o‘rinlar</p>
          <strong className="text-lg sm:text-[1.45rem]">{stats.free}</strong>
        </div>
        <div className="stat-quiet px-2 py-3 sm:px-4">
          <p className="leading-tight">Band o‘rinlar</p>
          <strong className="text-lg sm:text-[1.45rem]">{stats.occupied}</strong>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="F.I.Sh. / telefon / ID / xona"
          className="w-full lg:max-w-md"
        />
        <FloorFilter scope="manager" value={floor} onChange={setFloor} className="w-full lg:w-auto" />
      </div>
      {data.rows.length ? (
      <>
      <div className="mt-4 hidden overflow-x-auto lg:block">
        <table className="data-table">
          <thead>
            <tr>
              <th>F.I.Sh.</th>
              <th>Telefon</th>
              <th>ID raqami</th>
              <th>Jins</th>
              <th>Qavat</th>
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
                <td>{displayUzPhone(r.phone)}</td>
                <td>{dash(r.passportId)}</td>
                <td>{customerGenderLabel(r.gender)}</td>
                <td>{floorLabel(r.floor)}</td>
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
      <div className="mt-4 space-y-3 lg:hidden">
        {data.rows.map((r) => (
          <article key={r.id} className="mgr-list-card">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="font-semibold text-navy">{r.fullName}</p>
              <StatusBadge value={r.payStatus === "PAID" ? "PAID" : "UNPAID"} label={payStatusLabel(r.payStatus)} />
            </div>
            <div className="mgr-kv">
              <span>Telefon</span>
              <span>{displayUzPhone(r.phone)}</span>
            </div>
            <div className="mgr-kv">
              <span>ID raqami</span>
              <span>{dash(r.passportId)}</span>
            </div>
            <div className="mgr-kv">
              <span>Jins</span>
              <span>{customerGenderLabel(r.gender)}</span>
            </div>
            <div className="mgr-kv">
              <span>Qavat</span>
              <span>{floorLabel(r.floor)}</span>
            </div>
            <div className="mgr-kv">
              <span>Xona</span>
              <span>{roomLabel(r.room)}</span>
            </div>
            <div className="mgr-kv">
              <span>O‘rin</span>
              <span>{bedLabel(r.bed)}</span>
            </div>
            <div className="mgr-kv">
              <span>Kirish sanasi</span>
              <span>{formatDate(r.startDate)}</span>
            </div>
            <div className="mgr-kv">
              <span>Kunlik/Oylik</span>
              <span>{r.type ? stayTypeLabel(r.type) : "—"}</span>
            </div>
          </article>
        ))}
      </div>
      </>
      ) : null}
      {ready && !data.rows.length ? (
        <EmptyState className="mt-4" title="Mijozlar topilmadi" text="Qidiruv shartlarini o‘zgartirib ko‘ring." />
      ) : null}
      <PaginationBar page={page} pageSize={pageSize} total={data.total} onPage={setPage} onPageSize={setPageSize} />
    </div>
  );
}
