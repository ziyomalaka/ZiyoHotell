"use client";

import { FormEvent, useState } from "react";
import { api, newIdempotencyKey } from "@/lib/api";
import {
  DAILY_STAY_PRICE,
  DEFAULT_MONTHLY_PRICE,
  PAYMENT_METHOD_OPTIONS,
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
  // Oylik to'lovda standart summa — mijoz yashayotgan xonaning oylik narxi.
  // Migrantda narx jadvali yo'q: summa ham, qo'shiladigan kunlar ham qo'lda kiritiladi.
  const migrant = stay.type === "MIGRANT";
  const price = stay.monthlyPrice || DEFAULT_MONTHLY_PRICE;
  const [amount, setAmount] = useState(
    migrant ? "" : stay.type === "DAILY" ? String(DAILY_STAY_PRICE) : String(price),
  );
  const [type, setType] = useState(migrant ? "MIGRANT" : stay.type === "DAILY" ? "DAILY" : "MONTHLY");
  const [extraDays, setExtraDays] = useState("");
  const [method, setMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [idempotencyKey] = useState(newIdempotencyKey);

  const days = migrant
    ? Math.max(0, Math.trunc(Number(extraDays) || 0))
    : daysForAmount(Number(amount || 0), price, type);
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
          ...(migrant ? { days } : {}),
          method,
          paymentDate,
          note: note.trim() || undefined,
          idempotencyKey,
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
            inputMode="numeric"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-2 w-full"
          />
        </label>
        {migrant ? (
          <>
            <label className="mt-3 block text-sm font-medium">
              Qo‘shiladigan kunlar
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={extraDays}
                placeholder="0 — faqat qarz to‘lanadi"
                onChange={(e) => setExtraDays(e.target.value)}
                className="mt-2 w-full"
              />
            </label>
            <p className="mt-1 text-xs text-muted">
              Migrant: summa va kunlar qo‘lda kiritiladi.
              {days ? ` ${describeDays(days, type)} qo‘shiladi${coveredUntil ? `, chiqish ${coveredUntil}` : ""}.` : ""}
            </p>
          </>
        ) : (
        <p className="mt-1 text-xs text-muted">
          {type === "DAILY"
            ? `Kuniga ${formatMoney(DAILY_STAY_PRICE)}.`
            : `Kuniga ${formatMoney(Math.round(price / 30))}. 30 kun = 1 oy = ${formatMoney(price)}.`}
          {days
            ? ` Shu summa ${describeDays(days, type)} beradi${coveredUntil ? `, chiqish ${coveredUntil}` : ""}.`
            : ""}
        </p>
        )}
        {migrant ? (
          <p className="mt-3 text-sm font-medium">
            Yashash turi: <span className="font-normal">Migrant</span>
          </p>
        ) : (
        <label className="mt-3 block text-sm font-medium">
          Yashash turi
          <select
            value={type}
            onChange={(e) => {
              const next = e.target.value;
              setType(next);
              setAmount(next === "DAILY" ? String(DAILY_STAY_PRICE) : String(price));
            }}
            className="mt-2 w-full"
          >
            <option value="MONTHLY">Oylik</option>
            <option value="DAILY">Kunlik</option>
          </select>
        </label>
        )}
        <label className="mt-3 block text-sm font-medium">
          To‘lov turini tanlang
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-2 w-full">
            {PAYMENT_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
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
