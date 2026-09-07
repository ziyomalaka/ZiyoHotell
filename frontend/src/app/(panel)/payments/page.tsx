"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { FloorFilter } from "@/components/FloorFilter";
import { PaginationBar } from "@/components/PaginationBar";
import { StatusBadge } from "@/components/StatusBadge";
import { DEFAULT_MONTHLY_PRICE, daysForAmount, describeDays, floorLabel, formatDate, formatMoney, payStatusLabel, stayTypeLabel, todayISO } from "@/lib/format";

type Stay = {
  id: string;
  type: string;
  monthlyPrice?: number;
  paidUntil?: string | null;
  paidDays?: number;
  paidDaysLabel?: string;
  daysLeft?: number | null;
  customer: { fullName: string };
  room: { number: string; floor: number };
  bed: { number: number };
};

type Payment = {
  id: string;
  type: string;
  amount: number;
  days?: number;
  coversTo?: string | null;
  status: string;
  paidAt: string;
  customer: { fullName: string };
  stay: { room: { number: string; floor: number }; bed: { number: number } };
};

export default function PaymentsPage() {
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [floor, setFloor] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; rows: Payment[]; todayIncome?: number; monthIncome?: number }>({
    total: 0,
    rows: [],
  });
  const [stays, setStays] = useState<Stay[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ stayId: "", amount: String(DEFAULT_MONTHLY_PRICE), type: "MONTHLY", paymentDate: "", note: "" });
  const [error, setError] = useState("");

  async function load(nextPage = page) {
    const params = new URLSearchParams({ page: String(nextPage), q, type, status, from: date, to: date });
    if (floor) params.set("floor", floor);
    setData(await api(`/api/v1/reception/payments?${params}`));
  }

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, date, type, status, floor]);

  useEffect(() => {
    api<{ rows: Stay[] }>("/api/v1/reception/stays?tab=living&pageSize=100").then((r) => setStays(r.rows));
  }, []);

  async function createPayment(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/v1/reception/payments", {
        method: "POST",
        body: JSON.stringify({
          stayId: form.stayId,
          amount: Number(form.amount),
          type: form.type,
          paymentDate: form.paymentDate,
          note: form.note || undefined,
        }),
      });
      setOpen(false);
      setForm({ stayId: "", amount: String(DEFAULT_MONTHLY_PRICE), type: "MONTHLY", paymentDate: todayISO(), note: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="stat-quiet">
          <p>Bugungi tushum</p>
          <strong>{formatMoney(data.todayIncome || 0)}</strong>
        </div>
        <div className="stat-quiet">
          <p>Shu oy tushumi</p>
          <strong>{formatMoney(data.monthIncome || 0)}</strong>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidiruv" className="min-w-[180px] flex-1" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <FloorFilter scope="reception" value={floor} onChange={setFloor} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Kunlik / Oylik</option>
          <option value="DAILY">Kunlik</option>
          <option value="MONTHLY">Oylik</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">To‘ladi / To‘lamadi</option>
          <option value="PAID">To‘ladi</option>
          <option value="UNPAID">To‘lamadi</option>
        </select>
        <button onClick={() => { setForm((prev) => ({ ...prev, paymentDate: prev.paymentDate || todayISO() })); setOpen(true); }} className="btn-primary">
          To‘lov qo‘shish
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>F.I.Sh.</th>
              <th>Qavat</th>
              <th>Xona</th>
              <th>O‘rin</th>
              <th>Kunlik/Oylik</th>
              <th>Summa</th>
              <th>Davr</th>
              <th>Qaysigacha</th>
              <th>To‘lov holati</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.customer.fullName}</td>
                <td>{floorLabel(row.stay.room.floor)}</td>
                <td>{row.stay.room.number}</td>
                <td>{row.stay.bed.number}</td>
                <td>{stayTypeLabel(row.type)}</td>
                <td className="tabular">{formatMoney(row.amount)}</td>
                <td>{row.days ? describeDays(row.days) : "—"}</td>
                <td>{row.coversTo ? formatDate(row.coversTo) : "—"}</td>
                <td>
                  <StatusBadge value={row.status === "PAID" ? "PAID" : "UNPAID"} label={payStatusLabel(row.status)} />
                </td>
                <td>{formatDate(row.paidAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.rows.length ? <EmptyState className="mt-4" title="Bugun to‘lovlar mavjud emas." /> : null}
      <PaginationBar page={page} pageSize={20} total={data.total} onPage={(p) => { setPage(p); load(p); }} />

      {open ? (
        <div className="modal-backdrop">
          <form className="surface w-full max-w-md p-6" onSubmit={createPayment}>
            <h2 className="text-lg font-semibold text-navy">To‘lov qo‘shish</h2>
            <label className="mt-4 block text-sm font-medium">
              Mijoz
              <select required value={form.stayId} onChange={(e) => setForm({ ...form, stayId: e.target.value })} className="mt-2 w-full">
                <option value="">Tanlang</option>
                {stays.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.customer.fullName} — {s.room.floor}-qavat {s.room.number}/{s.bed.number}
                    {s.paidDaysLabel ? ` · ${s.paidDaysLabel}` : ""}
                    {s.daysLeft != null ? ` · ${s.daysLeft} kun` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-medium">
              Summa
              <input required type="number" min={1} step={1000} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full" />
            </label>
            {form.type === "MONTHLY" ? (
              <p className="mt-1 text-xs text-muted">
                {(() => {
                  const stay = stays.find((s) => s.id === form.stayId);
                  const price = stay?.monthlyPrice || DEFAULT_MONTHLY_PRICE;
                  const days = daysForAmount(Number(form.amount || 0), price);
                  return days
                    ? `Shu summa ${describeDays(days)} beradi va muddat to‘lov sanasidan (yoki qolgan muddat ustiga) qo‘shiladi.`
                    : `1 oy = ${formatMoney(price)} (30 kun).`;
                })()}
              </p>
            ) : null}
            <label className="mt-3 block text-sm font-medium">
              To‘lov turi
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-2 w-full">
                <option value="DAILY">Kunlik</option>
                <option value="MONTHLY">Oylik</option>
              </select>
            </label>
            <label className="mt-3 block text-sm font-medium">
              Sana
              <input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} className="mt-2 w-full" />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Izoh
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-2 w-full" />
            </label>
            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                Bekor qilish
              </button>
              <button className="btn-primary">SAQLASH</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
