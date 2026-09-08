"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import {
  DEFAULT_DAILY_PRICE,
  DEFAULT_MONTHLY_PRICE,
  addDays,
  daysForAmount,
  describeDays,
  formatDate,
  formatMoney,
  parseDate,
  todayISO,
} from "@/lib/format";

export type PayStay = {
  id: string;
  type: string;
  monthlyPrice?: number;
  paidDays?: number | null;
  startDate?: string | null;
  customerName: string;
};

export function AddPaymentModal({
  stay,
  onClose,
  onSaved,
}: {
  stay: PayStay;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(DEFAULT_MONTHLY_PRICE));
  const [type, setType] = useState(stay.type === "DAILY" ? "DAILY" : "MONTHLY");
  const [method, setMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const price = stay.monthlyPrice || DEFAULT_MONTHLY_PRICE;
  const days = daysForAmount(Number(amount || 0), price);
    const start = stay.startDate ? todayISO(stay.startDate) : "";
  const coveredUntil =
    days && start
      ? formatDate(addDays(parseDate(start), (stay.paidDays || 0) + days))
      : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api("/api/v1/reception/payments", {
        method: "POST",
        body: JSON.stringify({
          stayId: stay.id,
          amount: Number(amount),
          type,
          method,
          paymentDate,
          note: note.trim() || undefined,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "To‘lov saqlanmadi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="surface w-full max-w-md p-6" onSubmit={submit}>
        <h2 className="text-lg font-semibold text-navy">To‘lov qo‘shish</h2>
        <p className="mt-1 text-sm text-muted">{stay.customerName}</p>
        <label className="mt-4 block text-sm font-medium">
          Summa
          <input
            required
            type="number"
            min={1}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-2 w-full"
          />
        </label>
        <p className="mt-1 text-xs text-muted">
          Kuniga {formatMoney(DEFAULT_DAILY_PRICE)}. 30 kun = 1 oy = {formatMoney(price)}.
          {days
            ? ` Shu summa ${describeDays(days)} beradi${coveredUntil ? `, chiqish ${coveredUntil}` : ""}.`
            : ""}
        </p>
        <label className="mt-3 block text-sm font-medium">
          Yashash turi
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-2 w-full">
            <option value="MONTHLY">Oylik</option>
            <option value="DAILY">Kunlik</option>
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium">
          To‘lov turini tanlang
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-2 w-full">
            <option value="CASH">Naqd</option>
            <option value="CARD">Karta</option>
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium">
          Sana
          <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="mt-2 w-full" />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Izoh
          <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-2 w-full" />
        </label>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Bekor qilish
          </button>
          <button className="btn-primary" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "SAQLASH"}
          </button>
        </div>
      </form>
    </div>
  );
}
