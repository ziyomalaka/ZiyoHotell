"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EditCustomerModal } from "@/components/EditCustomerModal";
import { FloorFilter } from "@/components/FloorFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { checkoutDate, customerGenderLabel, dash, displayUzPhone, floorLabel, formatDate, payStatusLabel, stayTypeLabel } from "@/lib/format";

type Row = {
  id: string;
  fullName: string;
  phone: string;
  passportId?: string;
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

export default function AdminCustomersPage() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [pay, setPay] = useState("");
  const [floor, setFloor] = useState("");
  const [data, setData] = useState<{ rows: Row[] }>({ rows: [] });
  const [drop, setDrop] = useState<Row | null>(null);
  const [payRow, setPayRow] = useState<Row | null>(null);
  const [edit, setEdit] = useState<Row | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const p = new URLSearchParams({ tab, q, pay });
    if (floor) p.set("floor", floor);
    setData(await api(`/api/v1/admin/customers?${p}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, pay, floor]);

  async function remove() {
    if (!drop) return;
    setError("");
    try {
      await api(`/api/v1/admin/customers/${drop.id}`, { method: "DELETE" });
      setDrop(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mijozni o‘chirib bo‘lmadi.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {[
          ["all", "Barchasi"],
          ["living", "Hozir yashaydi"],
          ["left", "Chiqib ketgan"],
        ].map(([id, l]) => (
          <button key={id} onClick={() => { setTab(id); setPay(""); }} className={`chip ${tab === id && !pay ? "chip-active" : ""}`}>
            {l}
          </button>
        ))}
        <button onClick={() => { setTab("all"); setPay("PAID"); }} className={`chip ${pay === "PAID" ? "chip-active" : ""}`}>
          To‘ladi
        </button>
        <button onClick={() => { setTab("all"); setPay("UNPAID"); }} className={`chip ${pay === "UNPAID" ? "chip-active" : ""}`}>
          To‘lamadi
        </button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="F.I.Sh. / telefon / ID / xona" className="min-w-[200px] flex-1" />
        <FloorFilter scope="admin" value={floor} onChange={setFloor} />
      </div>
      {error ? <p className="mt-3 rounded-md bg-[#f8ecec] px-4 py-3 text-sm text-[#9b3b3b]">{error}</p> : null}
      <div className="mt-4 overflow-x-auto">
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
              <th>Chiqish sanasi</th>
              <th>To‘lov turi</th>
              <th>To‘lov holati</th>
              <th>Holati</th>
              <th>Amal</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.fullName}</td>
                <td>{displayUzPhone(r.phone)}</td>
                <td>{dash(r.passportId)}</td>
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
                      <button type="button" className="text-sm font-semibold text-royal" onClick={() => setPayRow(r)}>
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Tahrirlash"
                      aria-label="Tahrirlash"
                      onClick={() => setEdit(r)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-royal hover:bg-white"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                      </svg>
                    </button>
                    <button className="text-sm font-medium text-danger" onClick={() => setDrop(r)}>
                      O‘chirish
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {payRow?.occupancy?.stay.id ? (
        <AddPaymentModal
          stay={{
            id: payRow.occupancy.stay.id,
            type: payRow.occupancy.stay.type,
            monthlyPrice: payRow.occupancy.stay.monthlyPrice,
            paidDays: payRow.occupancy.stay.paidDays,
            startDate: payRow.occupancy.stay.startDate,
            customerName: payRow.fullName,
          }}
          onClose={() => setPayRow(null)}
          onSaved={() => {
            setPayRow(null);
            load();
          }}
        />
      ) : null}
      {edit ? (
        <EditCustomerModal
          customer={{ id: edit.id, fullName: edit.fullName, phone: edit.phone, gender: edit.gender }}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
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
