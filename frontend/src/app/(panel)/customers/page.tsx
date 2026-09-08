"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EmptyState } from "@/components/EmptyState";
import { FloorFilter } from "@/components/FloorFilter";
import { PaginationBar } from "@/components/PaginationBar";
import { StatusBadge } from "@/components/StatusBadge";
import { checkoutDate, customerGenderLabel, floorLabel, formatDate, payStatusLabel, stayTypeLabel } from "@/lib/format";

type Row = {
  id: string;
  fullName: string;
  phone: string;
  gender: string;
  payStatus: string;
  living?: boolean;
  occupancy?: {
    stay: {
      id: string;
      startDate: string;
      endDate?: string | null;
      paidUntil?: string | null;
      paidDays?: number | null;
      monthlyPrice?: number;
      checkoutDate?: string | null;
      type: string;
      room: { number: string; floor: number };
      bed: { number: number };
    };
  } | null;
};

export default function ReceptionCustomersPage() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [floor, setFloor] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; rows: Row[] }>({ total: 0, rows: [] });
  const [drop, setDrop] = useState<Row | null>(null);
  const [pay, setPay] = useState<Row | null>(null);
  const [error, setError] = useState("");

  async function load(nextPage = page) {
    const p = new URLSearchParams({ tab, q, page: String(nextPage) });
    if (floor) p.set("floor", floor);
    setData(await api(`/api/v1/reception/customers?${p}`));
  }

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, floor]);

  async function remove() {
    if (!drop) return;
    setError("");
    try {
      await api(`/api/v1/reception/customers/${drop.id}`, { method: "DELETE" });
      setDrop(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mijozni o‘chirib bo‘lmadi.");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["all", "Barchasi"],
          ["living", "Hozir yashaydi"],
          ["left", "Chiqib ketgan"],
        ].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`chip ${tab === id ? "chip-active" : ""}`}>
            {l}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="F.I.Sh. / telefon / xona" className="min-w-[200px] flex-1" />
        <FloorFilter scope="reception" value={floor} onChange={setFloor} />
      </div>
      {error ? <p className="mb-3 rounded-md bg-[#f8ecec] px-4 py-3 text-sm text-[#9b3b3b]">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>F.I.Sh.</th>
              <th>Telefon</th>
              <th>Jins</th>
              <th>Qavat</th>
              <th>Xona</th>
              <th>O‘rin</th>
              <th>Kirish</th>
              <th>Chiqish</th>
              <th>Turi</th>
              <th>To‘lov</th>
              <th>Holati</th>
              <th>Amal</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.fullName}</td>
                <td>{r.phone}</td>
                <td>{customerGenderLabel(r.gender)}</td>
                <td>{r.occupancy ? floorLabel(r.occupancy.stay.room.floor) : "—"}</td>
                <td>{r.occupancy?.stay.room.number || "—"}</td>
                <td>{r.occupancy?.stay.bed.number ?? "—"}</td>
                <td>{r.occupancy ? formatDate(r.occupancy.stay.startDate) : "—"}</td>
                <td>{r.occupancy ? formatDate(checkoutDate(r.occupancy.stay)) : "—"}</td>
                <td>{r.occupancy ? stayTypeLabel(r.occupancy.stay.type) : "—"}</td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={r.payStatus === "PAID" ? "PAID" : "UNPAID"} label={payStatusLabel(r.payStatus)} />
                    {r.living && r.occupancy?.stay.id ? (
                      <button type="button" className="text-sm font-semibold text-royal" onClick={() => setPay(r)}>
                        To‘lov
                      </button>
                    ) : null}
                  </div>
                </td>
                <td>
                  <StatusBadge
                    value={r.living ? "ACTIVE" : "COMPLETED"}
                    label={r.living ? "Yashaydi" : "Chiqib ketgan"}
                  />
                </td>
                <td>
                  <button className="text-sm font-medium text-danger" onClick={() => setDrop(r)}>
                    O‘chirish
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.rows.length ? <EmptyState className="mt-4" text="Hozircha mijozlar mavjud emas." /> : null}
      <PaginationBar page={page} pageSize={20} total={data.total} onPage={(p) => { setPage(p); load(p); }} />
      {pay?.occupancy?.stay.id ? (
        <AddPaymentModal
          stay={{
            id: pay.occupancy.stay.id,
            type: pay.occupancy.stay.type,
            monthlyPrice: pay.occupancy.stay.monthlyPrice,
            paidDays: pay.occupancy.stay.paidDays,
            startDate: pay.occupancy.stay.startDate,
            customerName: pay.fullName,
          }}
          onClose={() => setPay(null)}
          onSaved={() => {
            setPay(null);
            load();
          }}
        />
      ) : null}
      {drop ? (
        <ConfirmModal
          danger
          title="Mijozni o‘chirish"
          text={`${drop.fullName} ni o‘chirishni tasdiqlaysizmi?${drop.living ? "\nHozir yashayotgan mijozni avval chiqaring." : ""}`}
          confirmLabel="O‘chirish"
          onClose={() => setDrop(null)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
