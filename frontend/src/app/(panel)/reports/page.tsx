"use client";

import { useEffect, useState } from "react";
import { api, downloadExcel } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { FloorFilter } from "@/components/FloorFilter";
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
    customer: { fullName: string; phone: string; passportId?: string; gender: string };
    room: { number: string; floor: number };
    bed: { number: number };
  }[];
};

type PayRep = { total?: number; unpaidCount?: number; cash?: number; card?: number };

export default function ReportsPage() {
  const today = useTodayISO();
  const [tab, setTab] = useState<Tab>("customers");
  const [mode, setMode] = useState<"daily" | "monthly">("daily");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("");
  const [floor, setFloor] = useState("");
  const [range, setRange] = useState<MovementView>("daily");
  const [customers, setCustomers] = useState<CustomerRep | null>(null);
  const [payments, setPayments] = useState<PayRep | null>(null);
  const [due, setDue] = useState<PaymentDueData | null>(null);
  const [movement, setMovement] = useState<MovementData | null>(null);

  const from = mode === "daily" ? date : `${month}-01`;
  const to = mode === "daily" ? date : monthEnd(month);
  const floorParam = floor ? `&floor=${floor}` : "";

  useEffect(() => {
    if (!today) return;
    setDate((prev) => prev || today);
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
    if (!date || !month) return;
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
  }, [tab, mode, date, month, floor, range, from, to]);

  const excelType = tab === "customers" ? "customers" : tab;
  const excelQs =
    tab === "movement"
      ? `type=movement&range=${range}${floorParam}`
      : tab === "payment-due"
        ? `type=payment-due${floorParam}`
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
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
        <FloorFilter scope="reception" value={floor} onChange={setFloor} />
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

      {tab === "customers" ? (
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

function monthEnd(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}
