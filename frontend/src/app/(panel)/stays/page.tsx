"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { SectorFilter } from "@/components/SectorFilter";
import { PaginationBar } from "@/components/PaginationBar";
import { StatusBadge } from "@/components/StatusBadge";
import { checkoutDate, dash, displayUzPhone, daysLeftLabel, floorLabel, formatDate, formatMoney, methodLabel, PAYMENT_METHOD_OPTIONS, payStatusLabel, stayTypeLabel, todayISO } from "@/lib/format";

/** Chiqarish oldidan: foydalanilmagan kunlar va qaytarilishi mumkin bo‘lgan summa. */
type Preview = {
  checkoutDate: string;
  dueDate?: string | null;
  remainingDays: number;
  refundableDays: number;
  refundable: number;
};

type Stay = {
  id: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  type: string;
  totalAmount: number;
  paidAmount: number;
  paidDaysLabel?: string;
  paidUntil?: string | null;
  dueDate?: string | null;
  checkoutDate?: string | null;
  daysLeft?: number | null;
  overdue?: boolean;
  dueSoon?: boolean;
  customer: { fullName: string; phone: string; passportId?: string; birthDate?: string | null };
  room: { number: string; floor: number };
  bed: { number: number };
};

export default function StaysPage() {
  const [q, setQ] = useState("");
  const [floor, setFloor] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; rows: Stay[] }>({ total: 0, rows: [] });
  const [selected, setSelected] = useState<Stay | null>(null);
  const [outDate, setOutDate] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  // Muddat tugamagan bo‘lsa xodim tanlaydi: "yes" — qaytariladi, "no" — qaytarilmaydi.
  const [refundChoice, setRefundChoice] = useState<"" | "yes" | "no">("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [saving, setSaving] = useState(false);

  async function load(nextPage = page) {
    const params = new URLSearchParams({ tab: "living", page: String(nextPage), q });
    if (floor) params.set("floor", floor);
    setData(await api(`/api/v1/reception/stays?${params}`));
  }

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, floor]);

  // Chiqish sanasi o‘zgarsa qaytim qayta hisoblanadi.
  useEffect(() => {
    if (!selected || !outDate) return;
    let alive = true;
    api<Preview>(`/api/v1/reception/stays/${selected.id}/checkout-preview?at=${outDate}`)
      .then((p) => {
        if (!alive) return;
        setPreview(p);
        setRefundAmount(p.refundable > 0 ? String(p.refundable) : "");
      })
      .catch(() => {
        if (alive) setPreview(null);
      });
    return () => {
      alive = false;
    };
  }, [selected, outDate]);

  function openCheckout(row: Stay) {
    setError("");
    setPreview(null);
    setRefundChoice("");
    setRefundAmount("");
    setRefundMethod("CASH");
    setOutDate(todayISO());
    setSelected(row);
  }

  const needsChoice = (preview?.refundable ?? 0) > 0;

  async function checkout() {
    if (!selected) return;
    setError("");
    if (needsChoice && !refundChoice) {
      setError("To‘lov qaytariladimi yoki yo‘qmi — tanlang.");
      return;
    }
    const refund = needsChoice && refundChoice === "yes";
    const amount = Math.trunc(Number(refundAmount) || 0);
    if (refund && amount <= 0) {
      setError("Qaytim summasini kiriting.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/v1/reception/check-out", {
        method: "POST",
        body: JSON.stringify({
          stayId: selected.id,
          at: outDate,
          ...(needsChoice ? { refund } : {}),
          ...(refund ? { refundAmount: amount, refundMethod } : {}),
        }),
      });
      setNotice(
        refund
          ? `${selected.customer.fullName} chiqarildi. Qaytim: ${formatMoney(amount)} (${methodLabel(refundMethod)}) — mijozga qaytaring.`
          : `${selected.customer.fullName} chiqarildi.`,
      );
      setSelected(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {notice ? (
        <p className="mb-4 rounded-md bg-[#e8f4ec] px-4 py-3 text-sm text-[#2d6a45]">{notice}</p>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="F.I.Sh. / telefon / ID / xona" className="min-w-[220px] flex-1" />
        <SectorFilter scope="reception" value={floor} onChange={setFloor} />
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>F.I.Sh.</th>
              <th>Telefon</th>
              <th>ID raqami</th>
              <th>Tug‘ilgan sana</th>
              <th>Qavat</th>
              <th>Xona</th>
              <th>O‘rin</th>
              <th>Kirish sanasi</th>
              <th>To‘lov turi</th>
              <th>To‘lov holati</th>
              <th>Muddat</th>
              <th>Chiqish kuni</th>
              <th>Amal</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className={row.overdue ? "bg-[#f8ecec]" : row.dueSoon ? "bg-[#f8f3e8]" : undefined}>
                <td>{row.customer.fullName}</td>
                <td>{displayUzPhone(row.customer.phone)}</td>
                <td>{dash(row.customer.passportId)}</td>
                <td>{formatDate(row.customer.birthDate)}</td>
                <td>{floorLabel(row.room.floor)}</td>
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
                  {row.paidDaysLabel || "—"}
                  {row.dueDate ? ` · ${formatDate(row.dueDate)}` : ""}
                  {row.daysLeft != null ? ` · ${daysLeftLabel(row.daysLeft)}` : ""}
                </td>
                <td>{formatDate(checkoutDate(row))}</td>
                <td>
                  <button className="btn-primary min-h-9 px-3 text-sm" onClick={() => openCheckout(row)}>
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
        <div className="modal-backdrop">
          <div className="card max-h-[90vh] w-full max-w-md overflow-y-auto p-6">
            <h3 className="text-xl font-semibold text-navy">Chiqarish</h3>
            <p className="mt-3 text-muted">Ushbu mijozni yotoqxonadan chiqarishni tasdiqlaysizmi?</p>
            <p className="mt-3 text-sm text-navy">
              {selected.customer.fullName} · {floorLabel(selected.room.floor)} · {selected.room.number} /{" "}
              {selected.bed.number}
            </p>
            <label className="mt-4 block text-sm font-medium text-navy">
              Chiqish sanasi
              <input
                type="date"
                value={outDate}
                onChange={(e) => {
                  setOutDate(e.target.value);
                  setRefundChoice("");
                }}
                className="mt-2 w-full"
              />
            </label>

            {needsChoice && preview ? (
              <div className="mt-4 rounded-lg border border-[#e6d3a3] bg-[#f8f3e8] p-3 text-sm">
                <p className="font-medium text-navy">
                  Yashash muddati tugamagan: {preview.remainingDays} kun qoldi
                  {preview.dueDate ? ` (to‘langan muddat ${formatDate(preview.dueDate)} gacha)` : ""}.
                </p>
                <p className="mt-1 text-navy">To‘lov qaytariladimi?</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundChoice("yes")}
                    className={refundChoice === "yes" ? "btn-primary" : "btn-secondary"}
                  >
                    Ha, qaytarilsin
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundChoice("no")}
                    className={refundChoice === "no" ? "btn-primary" : "btn-secondary"}
                  >
                    Yo‘q
                  </button>
                </div>
                {refundChoice === "yes" ? (
                  <div className="mt-3 space-y-3">
                    <p className="rounded-md bg-[#f8ecec] px-3 py-2 font-semibold text-[#9b3b3b]">
                      Qaytim: {formatMoney(Number(refundAmount) || 0)} — mijozga qaytaring.
                      <span className="mt-0.5 block text-xs font-normal">
                        {preview.refundableDays} kun foydalanilmagan. Hisoblangan: {formatMoney(preview.refundable)}.
                      </span>
                    </p>
                    <label className="block font-medium text-navy">
                      Qaytim summasi
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="mt-2 w-full"
                      />
                    </label>
                    <label className="block font-medium text-navy">
                      Qanday qaytariladi
                      <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} className="mt-2 w-full">
                        {PAYMENT_METHOD_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : refundChoice === "no" ? (
                  <p className="mt-3 text-xs text-muted">To‘lov mijozdan olingan hisoblanadi va kassa hisobotida qoladi.</p>
                ) : null}
              </div>
            ) : null}

            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setSelected(null)} className="btn-secondary">
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={checkout}
                disabled={saving || (needsChoice && !refundChoice)}
                className="btn-danger"
              >
                {saving ? "Saqlanmoqda..." : "Tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
