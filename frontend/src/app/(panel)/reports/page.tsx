"use client";

import { useEffect, useState } from "react";
import { api, downloadExcel } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { SectorFilter } from "@/components/SectorFilter";
import { MovementTable, MOVEMENT_VIEWS, type MovementData, type MovementView } from "@/components/MovementTable";
import { PaymentDueTable, type PaymentDueData } from "@/components/PaymentDueTable";
import {
  checkoutDate,
  customerGenderLabel,
  dash,
  displayUzPhone,
  floorLabel,
  formatDate,
  formatMoney,
  methodLabel,
  PAYMENT_METHOD_OPTIONS,
  payStatusLabel,
  stayTypeLabel,
} from "@/lib/format";
import { useTodayISO } from "@/components/CurrentDate";

type Tab = "customers" | "payment-due" | "movement";

type CustomerRep = {
  total?: number;
  arrived?: number;
  left?: number;
  rows?: {
    type: string;
    totalAmount: number;
    paidAmount: number;
    paidDaysLabel?: string;
    dueDate?: string | null;
    checkoutDate?: string | null;
    startDate: string;
    endDate?: string | null;
    status: string;
    customer: { fullName: string; phone: string; passportId?: string; birthDate?: string | null; gender: string };
    room: { number: string; floor: number };
    bed: { number: number };
  }[];
};

type PayRep = { total?: number; unpaidCount?: number; cash?: number; card?: number; terminal?: number };

/** Kunlik tushum: bugungi to‘lovlar va naqd/karta/terminal jamlari. */
type DailyRep = PayRep & {
  rows: {
    id: string;
    amount: number;
    method: string;
    status: string;
    customer: { fullName: string };
    stay: { room: { number: string; floor: number }; bed: { number: number } };
    createdBy?: { fullName: string } | null;
  }[];
};

export default function ReportsPage() {
  const today = useTodayISO();
  const [tab, setTab] = useState<Tab>("customers");
  const [mode, setMode] = useState<"daily" | "monthly">("daily");
  const [month, setMonth] = useState("");
  const [floor, setFloor] = useState("");
  const [range, setRange] = useState<MovementView>("daily");
  const [customers, setCustomers] = useState<CustomerRep | null>(null);
  const [payments, setPayments] = useState<PayRep | null>(null);
  const [due, setDue] = useState<PaymentDueData | null>(null);
  const [movement, setMovement] = useState<MovementData | null>(null);
  const [daily, setDaily] = useState<DailyRep | null>(null);

  // Kunlik hisobot faqat bugungi kun uchun.
  const from = mode === "daily" ? today : `${month}-01`;
  const to = mode === "daily" ? today : monthEnd(month);
  const floorParam = floor ? `&floor=${floor}` : "";

  useEffect(() => {
    if (!today) return;
    setMonth((prev) => prev || today.slice(0, 7));
  }, [today]);

  useEffect(() => {
    if (tab === "payment-due") {
      const q = floor ? `?floor=${floor}` : "";
      api<PaymentDueData>(`/api/v1/reception/reports/payment-due${q}`).then(setDue).catch(() => setDue(null));
      return;
    }
    if (tab === "movement") {
      const q = new URLSearchParams({ range });
      if (floor) q.set("floor", floor);
      api<MovementData>(`/api/v1/reception/reports/movement?${q}`).then(setMovement).catch(() => setMovement(null));
      return;
    }
    if (mode === "daily") {
      if (!today) return;
      const q = new URLSearchParams({ from: today, to: today });
      if (floor) q.set("floor", floor);
      api<DailyRep>(`/api/v1/reception/reports/payments?${q}`).then(setDaily).catch(() => setDaily(null));
      return;
    }
    if (!month) return;
    const q = new URLSearchParams({ from, to });
    if (floor) q.set("floor", floor);
    Promise.all([
      api<CustomerRep>(`/api/v1/reception/reports/customers?${q}`),
      api<PayRep>(`/api/v1/reception/reports/payments?${q}`),
    ]).then(([c, p]) => {
      setCustomers(c);
      setPayments(p);
    }).catch(() => {
      setCustomers(null);
      setPayments(null);
    });
  }, [tab, mode, today, month, floor, range, from, to]);

  const dailyView = tab === "customers" && mode === "daily";
  const excelType = dailyView ? "KunlikTushum" : tab === "customers" ? "customers" : tab;
  const excelQs =
    tab === "movement"
      ? `type=movement&range=${range}${floorParam}`
      : tab === "payment-due"
        ? `type=payment-due${floorParam}`
        : dailyView
          ? `type=daily-income&from=${today}&to=${today}${floorParam}`
          : `type=customers&from=${from}&to=${to}${floorParam}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setTab("customers")} className={`chip ${tab === "customers" ? "chip-active" : ""}`}>
          Mijozlar
        </button>
        <button onClick={() => setTab("payment-due")} className={`chip ${tab === "payment-due" ? "chip-active" : ""}`}>
          To‘lov muddati
        </button>
        <button onClick={() => setTab("movement")} className={`chip ${tab === "movement" ? "chip-active" : ""}`}>
          Kirim-chiqim
        </button>
        {tab === "customers" ? (
          <>
            <button onClick={() => setMode("daily")} className={`chip ${mode === "daily" ? "chip-active" : ""}`}>
              Kunlik
            </button>
            <button onClick={() => setMode("monthly")} className={`chip ${mode === "monthly" ? "chip-active" : ""}`}>
              Oylik
            </button>
            {mode === "daily" ? (
              <span className="text-sm text-muted">Bugun: {formatDate(today)}</span>
            ) : (
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            )}
          </>
        ) : null}
        {tab === "movement"
          ? MOVEMENT_VIEWS.map((v) => (
              <button key={v.id} onClick={() => setRange(v.id)} className={`chip ${range === v.id ? "chip-active" : ""}`}>
                {v.label}
              </button>
            ))
          : null}
        <SectorFilter scope="reception" value={floor} onChange={setFloor} />
        <ExportExcelButton
          onClick={() => downloadExcel(`/api/v1/reception/reports/export/excel?${excelQs}`, `Yotoqxona_${excelType}.xlsx`)}
        />
      </div>

      {tab === "payment-due" ? (
        <div className="mt-5">
          <PaymentDueTable data={due} />
          {!due?.rows.length ? <EmptyState className="mt-4" text="Yashovchi mijoz yo‘q." /> : null}
        </div>
      ) : null}

      {tab === "movement" ? (
        <div className="mt-5">
          <MovementTable data={movement} />
        </div>
      ) : null}

      {dailyView ? <DailyIncome data={daily} /> : null}

      {tab === "customers" && !dailyView ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="stat-quiet">
              <p>Jami mijozlar</p>
              <strong>{customers?.total || 0}</strong>
            </div>
            <div className="stat-quiet">
              <p>Jami kirganlar</p>
              <strong>{customers?.arrived || 0}</strong>
            </div>
            <div className="stat-quiet">
              <p>Jami chiqqanlar</p>
              <strong>{customers?.left || 0}</strong>
            </div>
            <div className="stat-quiet">
              <p>Jami to‘lov</p>
              <strong className="text-lg">{formatMoney(payments?.total || 0)}</strong>
            </div>
            <div className="stat-quiet">
              <p>Naqd</p>
              <strong className="text-lg">{formatMoney(payments?.cash || 0)}</strong>
            </div>
            <div className="stat-quiet">
              <p>Karta</p>
              <strong className="text-lg">{formatMoney(payments?.card || 0)}</strong>
            </div>
            <div className="stat-quiet">
              <p>Terminal</p>
              <strong className="text-lg">{formatMoney(payments?.terminal || 0)}</strong>
            </div>
            <div className="stat-quiet">
              <p>To‘lamaganlar</p>
              <strong>{payments?.unpaidCount || 0}</strong>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>F.I.Sh.</th>
                  <th>Telefon</th>
                  <th>ID raqami</th>
                  <th>Tug‘ilgan sana</th>
                  <th>Jins</th>
                  <th>Qavat</th>
                  <th>Xona</th>
                  <th>O‘rin</th>
                  <th>Turi</th>
                  <th>Summa</th>
                  <th>Davr</th>
                  <th>Muddat</th>
                  <th>Holati</th>
                  <th>Kirish</th>
                  <th>Chiqish</th>
                </tr>
              </thead>
              <tbody>
                {(customers?.rows || []).map((row, i) => (
                  <tr key={i}>
                    <td>{row.customer.fullName}</td>
                    <td>{displayUzPhone(row.customer.phone)}</td>
                    <td>{dash(row.customer.passportId)}</td>
                    <td>{formatDate(row.customer.birthDate)}</td>
                    <td>{customerGenderLabel(row.customer.gender)}</td>
                    <td>{floorLabel(row.room.floor)}</td>
                    <td>{row.room.number}</td>
                    <td>{row.bed.number}</td>
                    <td>{stayTypeLabel(row.type)}</td>
                    <td className="tabular">{formatMoney(row.totalAmount)}</td>
                    <td>{row.paidDaysLabel || "—"}</td>
                    <td>{formatDate(row.dueDate)}</td>
                    <td>{payStatusLabel(row.paidAmount > 0 ? "PAID" : "UNPAID")}</td>
                    <td>{formatDate(row.startDate)}</td>
                    <td>{formatDate(checkoutDate(row) || row.endDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!(customers?.rows || []).length ? <EmptyState className="mt-4" text="Hozircha mijozlar mavjud emas." /> : null}
        </>
      ) : null}
    </div>
  );
}

/** Bugungi tushum: jami, to‘lov turlari bo‘yicha soni va summasi, hamda bugungi to‘lovlar. */
function DailyIncome({ data }: { data: DailyRep | null }) {
  const rows = data?.rows || [];
  const paid = rows.filter((r) => r.status === "PAID");
  const byMethod = PAYMENT_METHOD_OPTIONS.map((o): { label: string; count: number; sum: number } => {
    const list = paid.filter((r) => r.method === o.value);
    return { label: o.label, count: list.length, sum: list.reduce((a, r) => a + r.amount, 0) };
  });
  const other = paid.filter((r) => !PAYMENT_METHOD_OPTIONS.some((o) => o.value === r.method));
  if (other.length) byMethod.push({ label: "Boshqa", count: other.length, sum: other.reduce((a, r) => a + r.amount, 0) });

  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="stat-quiet">
          <p>Bugungi tushum</p>
          <strong className="text-lg">{formatMoney(data?.total || 0)}</strong>
          <p className="mt-1 text-[11px] normal-case tracking-normal text-muted">{paid.length} ta to‘lov</p>
        </div>
        <div className="stat-quiet">
          <p>Naqd</p>
          <strong className="text-lg">{formatMoney(data?.cash || 0)}</strong>
        </div>
        <div className="stat-quiet">
          <p>Karta</p>
          <strong className="text-lg">{formatMoney(data?.card || 0)}</strong>
        </div>
        <div className="stat-quiet">
          <p>Terminal</p>
          <strong className="text-lg">{formatMoney(data?.terminal || 0)}</strong>
        </div>
        <div className="stat-quiet">
          <p>To‘lamadi</p>
          <strong className="text-lg">{rows.filter((r) => r.status === "UNPAID").length} ta</strong>
        </div>
      </div>
      <p className="text-xs text-muted">50/50 to‘lovlar yarmi naqdga, yarmi kartaga qo‘shib hisoblangan.</p>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>To‘lov turi</th>
              <th>Soni</th>
              <th>Summa</th>
            </tr>
          </thead>
          <tbody>
            {byMethod.map((m) => (
              <tr key={m.label}>
                <td>{m.label}</td>
                <td>{m.count} ta</td>
                <td className="tabular whitespace-nowrap">{formatMoney(m.sum)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td>Jami</td>
              <td>{paid.length} ta</td>
              <td className="tabular whitespace-nowrap">{formatMoney(data?.total || 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mijoz</th>
              <th>Xona</th>
              <th>Summa</th>
              <th>To‘lov turi</th>
              <th>Holat</th>
              <th>Kim kiritgan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.customer.fullName}</td>
                <td>
                  {floorLabel(r.stay.room.floor)} · {r.stay.room.number}/{r.stay.bed.number}
                </td>
                <td className="tabular whitespace-nowrap">{formatMoney(r.amount)}</td>
                <td>{r.status === "PAID" ? methodLabel(r.method) : "—"}</td>
                <td>{payStatusLabel(r.status)}</td>
                <td>{r.createdBy?.fullName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <EmptyState className="mt-4" text="Bugun hali to‘lov yo‘q." /> : null}
    </div>
  );
}

function monthEnd(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}
