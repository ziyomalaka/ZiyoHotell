"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { FormField } from "@/components/FormSection";
import { CurrentDate, CurrentGreeting, useTodayISO } from "@/components/CurrentDate";
import { customerGenderLabel, DEFAULT_MONTHLY_PRICE, DEFAULT_REGISTER_AMOUNT, daysForAmount, describeDays, floorLabel, formatDate, formatLongDate, formatMoney, parseDate, addDays, todayISO } from "@/lib/format";

type Room = {
  id: string;
  number: string;
  floor?: number | null;
  gender: string;
  status: string;
  monthlyPrice?: number;
  beds: { id: string; number: number; status: string; occupancy: unknown }[];
};

type Home = {
  greeting?: string;
  date?: string;
  freeBeds: number;
  inToday: number;
  todayIncome: number;
  recent: {
    id: string;
    customer: { fullName: string; phone: string; gender: string };
    room: { number: string; floor: number };
    bed: { number: number };
  }[];
};

const emptyForm = {
  fullName: "",
  phone: "",
  gender: "MALE" as "MALE" | "FEMALE",
  roomId: "",
  bedId: "",
  stayType: "MONTHLY" as "DAILY" | "MONTHLY",
  amount: String(DEFAULT_REGISTER_AMOUNT),
  paymentStatus: "PAID" as "PAID" | "UNPAID",
  startDate: "",
  notes: "",
};

export default function RegisterPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [home, setHome] = useState<Home | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const today = useTodayISO();

  function load() {
    api<Room[]>("/api/v1/reception/rooms").then(setRooms).catch((e) => setError(e.message));
    api<Home>("/api/v1/reception/home").then(setHome).catch(() => null);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (today) setForm((prev) => (prev.startDate ? prev : { ...prev, startDate: today }));
  }, [today]);

  // Faqat mijoz jinsiga ajratilgan xonalar ko‘rsatiladi — aralash joylashtirish oldini oladi.
  const activeRooms = useMemo(
    () => rooms.filter((r) => r.status === "ACTIVE" && r.gender === form.gender),
    [rooms, form.gender],
  );
  const room = activeRooms.find((r) => r.id === form.roomId);
  const freeBeds = (room?.beds || []).filter((b) => !b.occupancy && b.status === "ACTIVE");
  const monthlyPrice = room?.monthlyPrice || DEFAULT_MONTHLY_PRICE;
  const paidPreview = form.paymentStatus === "PAID" ? Math.max(0, Number(form.amount || 0)) : 0;
  const coveredDays = form.stayType === "MONTHLY" ? daysForAmount(paidPreview, monthlyPrice) : 0;
  const coveredUntil =
    form.stayType === "MONTHLY" && coveredDays && (today || form.startDate)
      ? formatDate(addDays(parseDate(today || form.startDate), coveredDays))
      : null;

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!form.fullName.trim() || !form.phone.trim() || !form.bedId || !form.startDate) {
      setError("Majburiy maydonlarni to‘ldiring.");
      return;
    }
    const amount = Math.max(0, Number(form.amount || 0));
    setSaving(true);
    try {
      const stay = await api<{ paidDaysLabel?: string; dueDate?: string | null }>("/api/v1/reception/customers/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          gender: form.gender,
          notes: form.notes.trim() || null,
          bedId: form.bedId,
          stayType: form.stayType,
          startDate: form.startDate,
          amount,
          paidAmount: form.paymentStatus === "PAID" ? amount : 0,
          paymentStatus: form.paymentStatus,
        }),
      });
      const due = stay.dueDate ? ` Muddat ${formatDate(stay.dueDate)} gacha (${stay.paidDaysLabel || describeDays(coveredDays)}).` : "";
      setSuccess(`Mijoz muvaffaqiyatli ro‘yxatga olindi.${due}`);
      setForm({ ...emptyForm, startDate: todayISO() });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold">ZiyoHotel</p>
          <h2 className="mt-1 text-2xl font-semibold text-navy">{home?.greeting || <CurrentGreeting />}</h2>
          <p className="mt-1 text-sm text-muted">
            Bugun: {home?.date ? formatLongDate(home.date) : <CurrentDate />}
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <a href="#register-form" className="register-cta">
          <span className="text-gold-premium">+</span>
          <span>
            <strong className="block text-lg">Yangi mijozni</strong>
            ro‘yxatga olish
          </span>
        </a>
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-quiet">
            <p>Bo‘sh o‘rinlar</p>
            <strong>{home?.freeBeds ?? "—"}</strong>
          </div>
          <div className="stat-quiet">
            <p>Bugun kelganlar</p>
            <strong>{home?.inToday ?? "—"}</strong>
          </div>
          <div className="stat-quiet">
            <p>Bugun tushum</p>
            <strong className="text-base">{formatMoney(home?.todayIncome || 0)}</strong>
          </div>
        </div>
      </div>

      <form id="register-form" onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="F.I.Sh." required>
            <input value={form.fullName} onChange={(e) => patch("fullName", e.target.value)} className="w-full" />
          </FormField>
          <FormField label="Telefon" required>
            <input value={form.phone} onChange={(e) => patch("phone", e.target.value)} className="w-full" />
          </FormField>
          <FormField label="Jinsi" required>
            <select
              value={form.gender}
              onChange={(e) =>
                // Jins o‘zgarsa tanlangan xona/o‘rin boshqa jinsga tegishli bo‘lib qolmasligi uchun tozalanadi.
                setForm((prev) => ({ ...prev, gender: e.target.value as "MALE" | "FEMALE", roomId: "", bedId: "" }))
              }
              className="w-full"
            >
              <option value="MALE">Bola</option>
              <option value="FEMALE">Qiz</option>
            </select>
          </FormField>
          <FormField label="Xona" required>
            <select
              value={form.roomId}
              onChange={(e) => setForm((prev) => ({ ...prev, roomId: e.target.value, bedId: "" }))}
              className="w-full"
            >
              <option value="">
                {activeRooms.length
                  ? "Tanlang"
                  : `${form.gender === "FEMALE" ? "Qizlar" : "Bollar"} uchun xona yo‘q`}
              </option>
              {activeRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.floor ? `${r.floor}-qavat · ${r.number}-xona` : `${r.number}-xona`}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="O‘rin" required>
            <select value={form.bedId} onChange={(e) => patch("bedId", e.target.value)} className="w-full">
              <option value="">{form.roomId ? "Bo‘sh o‘rin" : "Avval xona tanlang"}</option>
              {freeBeds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.number}-o‘rin — BO‘SH
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="To‘lov turi" required>
            <select
              value={form.stayType}
              onChange={(e) => {
                const stayType = e.target.value as "DAILY" | "MONTHLY";
                setForm((prev) => ({
                  ...prev,
                  stayType,
                  amount: stayType === "MONTHLY" && !prev.amount ? String(DEFAULT_REGISTER_AMOUNT) : prev.amount,
                }));
              }}
              className="w-full"
            >
              <option value="MONTHLY">Oylik</option>
              <option value="DAILY">Kunlik</option>
            </select>
          </FormField>
          <FormField label="To‘lov summasi">
            <input type="number" min={0} step={1000} value={form.amount} onChange={(e) => patch("amount", e.target.value)} className="w-full" />
            {form.stayType === "MONTHLY" ? (
              <p className="mt-1 text-xs text-muted">
                1 oy = {formatMoney(monthlyPrice)} (30 kun). Boshida odatda 3 oylik — {formatMoney(DEFAULT_REGISTER_AMOUNT)}.
                {paidPreview > 0
                  ? ` Shu summa ${describeDays(coveredDays)} beradi${coveredUntil ? `, muddat ${coveredUntil} gacha` : ""}.`
                  : " To‘lamasa muddat hisoblanmaydi."}
              </p>
            ) : null}
          </FormField>
          <FormField label="To‘lov holati" required>
            <select value={form.paymentStatus} onChange={(e) => patch("paymentStatus", e.target.value as "PAID" | "UNPAID")} className="w-full">
              <option value="PAID">To‘ladi</option>
              <option value="UNPAID">To‘lamadi</option>
            </select>
          </FormField>
          <FormField label="Kirish sanasi" required>
            <input type="date" value={form.startDate} onChange={(e) => patch("startDate", e.target.value)} className="w-full" />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Izoh">
              <textarea value={form.notes} onChange={(e) => patch("notes", e.target.value)} className="w-full" />
            </FormField>
          </div>
        </div>
        {success ? <p className="rounded-md bg-[#e8f4ec] px-4 py-3 text-sm text-[#2d6a45]">{success}</p> : null}
        {error ? <p className="rounded-md bg-[#f8ecec] px-4 py-3 text-sm text-[#9b3b3b]">{error}</p> : null}
        <button className="btn-primary h-12 w-full text-base md:w-auto md:min-w-64" disabled={saving}>
          {saving ? "Saqlanmoqda..." : "SAQLASH"}
        </button>
      </form>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted">So‘nggi mijozlar</h3>
        {home?.recent?.length ? (
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
                </tr>
              </thead>
              <tbody>
                {home.recent.map((row) => (
                  <tr key={row.id}>
                    <td>{row.customer.fullName}</td>
                    <td>{row.customer.phone}</td>
                    <td>{customerGenderLabel(row.customer.gender)}</td>
                    <td>{floorLabel(row.room.floor)}</td>
                    <td>{row.room.number}</td>
                    <td>{row.bed.number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Hozircha mijozlar mavjud emas.</p>
        )}
      </section>
    </div>
  );
}
