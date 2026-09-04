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

export default function ManagerReportsPage() {
  const today = useTodayISO();
  const [mode, setMode] = useState<Mode>("daily");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("");
  const [customers, setCustomers] = useState<CustomerRep | null>(null);
  const [payments, setPayments] = useState<PayRep | null>(null);

  const from = mode === "daily" ? date : `${month}-01`;
  const to = mode === "daily" ? date : monthEnd(month);

  useEffect(() => {
    if (!today) return;
    setDate((prev) => prev || today);
    setMonth((prev) => prev || today.slice(0, 7));
  }, [today]);

  useEffect(() => {
    if (!from || from.startsWith("-") || !to) return;
    const q = new URLSearchParams({ from, to });
    Promise.all([
      api<CustomerRep>(`/api/v1/manager/reports/customers?${q}`),
      mode === "daily"
        ? api<PayRep>(`/api/v1/manager/payments/daily?date=${from}`)
        : api<PayRep>(`/api/v1/manager/payments/monthly?year=${month.slice(0, 4)}&month=${Number(month.slice(5, 7))}`),
    ]).then(([c, p]) => {
      setCustomers(c);
      setPayments(p);
    });
  }, [from, to, mode, month]);

  const unpaidRows = (customers?.rows || []).filter((r) => r.paidAmount <= 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setMode("daily")} className={`chip ${mode === "daily" ? "chip-active" : ""}`}>
          Kunlik hisobot
        </button>
        <button onClick={() => setMode("monthly")} className={`chip ${mode === "monthly" ? "chip-active" : ""}`}>
          Oylik hisobot
        </button>
        {mode === "daily" ? (
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        ) : (
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        )}
        <ExportExcelButton
          onClick={() =>
            downloadExcel(
              `/api/v1/manager/reports/export/excel?type=customers&from=${from}&to=${to}`,
              "Yotoqxona_Hisobot.xlsx",
            )
          }
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-quiet">
          <p>Jami mijozlar</p>
          <strong>{customers?.total || 0}</strong>
        </div>
        <div className="stat-quiet">
          <p>Kirganlar</p>
          <strong>{customers?.arrived || 0}</strong>
        </div>
        <div className="stat-quiet">
          <p>Chiqqanlar</p>
          <strong>{customers?.left || 0}</strong>
        </div>
        <div className="stat-quiet">
          <p>Jami to‘lov</p>
          <strong className="text-lg">{formatMoney(payments?.total || 0)}</strong>
        </div>
      </div>

      <h3 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted">To‘lamagan mijozlar</h3>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>F.I.Sh.</th>
              <th>Xona</th>
              <th>Turi</th>
              <th>Summa</th>
              <th>Holati</th>
              <th>Kirish</th>
            </tr>
          </thead>
          <tbody>
            {unpaidRows.map((row, i) => (
              <tr key={i}>
                <td>{row.customer.fullName}</td>
                <td>
                  {row.room.number}/{row.bed.number}
                </td>
                <td>{stayTypeLabel(row.type)}</td>
                <td className="tabular">{formatMoney(row.totalAmount)}</td>
                <td>{payStatusLabel("UNPAID")}</td>
                <td>{formatDate(row.startDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!unpaidRows.length ? <EmptyState className="mt-4" title="To‘lamagan mijoz yo‘q." /> : null}
    </div>
  );
}

function monthEnd(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}
