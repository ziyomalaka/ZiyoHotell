"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EmptyState } from "@/components/EmptyState";
import { PaginationBar } from "@/components/PaginationBar";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, payStatusLabel, stayTypeLabel, todayISO } from "@/lib/format";

type Stay = {
  id: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  type: string;
  totalAmount: number;
  paidAmount: number;
  customer: { fullName: string; phone: string };
  room: { number: string };
  bed: { number: number };
};

export default function StaysPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; rows: Stay[] }>({ total: 0, rows: [] });
  const [selected, setSelected] = useState<Stay | null>(null);
  const [outDate, setOutDate] = useState("");
  const [error, setError] = useState("");

  async function load(nextPage = page) {
    const params = new URLSearchParams({ tab: "living", page: String(nextPage), q });
    setData(await api(`/api/v1/reception/stays?${params}`));
  }

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function checkout() {
    if (!selected) return;
    setError("");
    try {
      await api("/api/v1/reception/check-out", {
        method: "POST",
        body: JSON.stringify({ stayId: selected.id, at: outDate }),
      });
      setSelected(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="F.I.Sh. / telefon / xona" className="min-w-[220px] flex-1" />
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>F.I.Sh.</th>
              <th>Telefon</th>
              <th>Xona</th>
              <th>O‘rin</th>
              <th>Kirish sanasi</th>
              <th>To‘lov turi</th>
              <th>To‘lov holati</th>
              <th>Amal</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.customer.fullName}</td>
                <td>{row.customer.phone}</td>
                <td>{row.room.number}</td>
                <td>{row.bed.number}</td>
                <td>{formatDate(row.startDate)}</td>
                <td>{stayTypeLabel(row.type)}</td>
                <td>
                  <StatusBadge
                    value={row.paidAmount > 0 ? "PAID" : "UNPAID"}
                    label={payStatusLabel(row.paidAmount > 0 ? "PAID" : "UNPAID")}
                  />
                </td>
                <td>
                  <button className="btn-primary min-h-9 px-3 text-sm" onClick={() => { setOutDate(todayISO()); setSelected(row); }}>
                    CHIQARISH
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.rows.length ? <EmptyState className="mt-4" text="Hozircha mijozlar mavjud emas." /> : null}
      <PaginationBar page={page} pageSize={20} total={data.total} onPage={(p) => { setPage(p); load(p); }} />
      {selected ? (
        <ConfirmModal
          danger
          title="Chiqarish"
          text="Ushbu mijozni yotoqxonadan chiqarishni tasdiqlaysizmi?"
          confirmLabel="Tasdiqlash"
          onClose={() => setSelected(null)}
          onConfirm={checkout}
        >
          <p className="mt-3 text-sm text-navy">
            {selected.customer.fullName} · {selected.room.number} / {selected.bed.number}
          </p>
          <label className="mt-4 block text-sm font-medium text-navy">
            Chiqish sanasi
            <input type="date" value={outDate} onChange={(e) => setOutDate(e.target.value)} className="mt-2 w-full" />
          </label>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        </ConfirmModal>
      ) : null}
    </div>
  );
}
