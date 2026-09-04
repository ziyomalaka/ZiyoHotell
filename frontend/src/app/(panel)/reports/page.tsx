"use client";

import { useEffect, useState } from "react";
import { api, downloadExcel } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { formatDate, formatMoney, payStatusLabel, stayTypeLabel } from "@/lib/format";
import { useTodayISO } from "@/components/CurrentDate";

type Mode = "daily" | "monthly";

type CustomerRep = {
  total?: number;
  arrived?: number;
  left?: number;
  rows?: {
    type: string;
    totalAmount: number;
    paidAmount: number;
    startDate: string;
    endDate?: string | null;
    status: string;
    customer: { fullName: string; phone: string };
    room: { number: string };
    bed: { number: number };
  }[];
};

type PayRep = { total?: number; unpaidCount?: number };

export default function ReportsPage() {
  const today = useTodayISO();
  const [mode, setMode] = useState<Mode>("daily");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("");
  const [customers, setCustomers] = useState<CustomerRep | null>(null);
  const [payments, setPayments] = useState<PayRep | null>(null);

  const from = mode === "daily" ? date : `${month}-01`;
  const to = mode === "daily" ? date : monthEnd(month);

  async function load() {
    const q = new URLSearchParams({ from, to });
    const [c, p] = await Promise.all([
      api<CustomerRep>(`/api/v1/reception/reports/customers?${q}`),
      api<PayRep>(`/api/v1/reception/reports/payments?${q}`),
    ]);
    setCustomers(c);
    setPayments(p);
  }

  useEffect(() => {
    if (!today) return;
    setDate((prev) => prev || today);
    setMonth((prev) => prev || today.slice(0, 7));
  }, [today]);

  useEffect(() => {
    if (!date || !month) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, date, month]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
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
        <ExportExcelButton onClick={() => downloadExcel(`/api/v1/reception/reports/export/excel?type=customers&from=${from}&to=${to}`, "Yotoqxona_Hisobot.xlsx")} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              <th>Xona</th>
              <th>O‘rin</th>
              <th>Turi</th>
              <th>Summa</th>
              <th>Holati</th>
              <th>Kirish</th>
              <th>Chiqish</th>
            </tr>
          </thead>
          <tbody>
            {(customers?.rows || []).map((row, i) => (
              <tr key={i}>
                <td>{row.customer.fullName}</td>
                <td>{row.customer.phone}</td>
                <td>{row.room.number}</td>
                <td>{row.bed.number}</td>
                <td>{stayTypeLabel(row.type)}</td>
                <td className="tabular">{formatMoney(row.totalAmount)}</td>
                <td>{payStatusLabel(row.paidAmount > 0 ? "PAID" : "UNPAID")}</td>
                <td>{formatDate(row.startDate)}</td>
                <td>{row.status === "COMPLETED" ? formatDate(row.endDate) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!(customers?.rows || []).length ? <EmptyState className="mt-4" text="Hozircha mijozlar mavjud emas." /> : null}
    </div>
  );
}

function monthEnd(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}
