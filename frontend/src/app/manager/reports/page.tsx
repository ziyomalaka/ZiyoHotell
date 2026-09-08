"use client";

import { useEffect, useState } from "react";
import { api, downloadExcel } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { FloorFilter } from "@/components/FloorFilter";
import { MovementTable, MOVEMENT_VIEWS, type MovementData, type MovementView } from "@/components/MovementTable";
import { PaymentDueTable, type PaymentDueData } from "@/components/PaymentDueTable";
import { checkoutDate, floorLabel, formatDate, formatMoney, payStatusLabel, stayTypeLabel } from "@/lib/format";
import { useTodayISO } from "@/components/CurrentDate";

type Tab = "movement" | "payment-due" | "customers";

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
    paidUntil?: string | null;
    endDate?: string | null;
    startDate: string;
    status: string;
    customer: { fullName: string; phone: string };
    room: { number: string; floor: number };
    bed: { number: number };
  }[];
};

export default function ManagerReportsPage() {
  const today = useTodayISO();
  const [tab, setTab] = useState<Tab>("movement");
  const [range, setRange] = useState<MovementView>("daily");
  const [floor, setFloor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customers, setCustomers] = useState<CustomerRep | null>(null);
  const [due, setDue] = useState<PaymentDueData | null>(null);
  const [movement, setMovement] = useState<MovementData | null>(null);

  const floorParam = floor ? `&floor=${floor}` : "";

  useEffect(() => {
    if (!today) return;
    setFrom((prev) => prev || today);
    setTo((prev) => prev || today);
  }, [today]);

  useEffect(() => {
    if (tab === "movement") {
      const q = new URLSearchParams({ range });
      if (floor) q.set("floor", floor);
      api<MovementData>(`/api/v1/manager/reports/movement?${q}`).then(setMovement).catch(() => setMovement(null));
      return;
    }
    if (tab === "payment-due") {
      api<PaymentDueData>(`/api/v1/manager/reports/payment-due${floor ? `?floor=${floor}` : ""}`).then(setDue).catch(() => setDue(null));
      return;
    }
    if (!from || !to) return;
    const q = new URLSearchParams({ from, to });
    if (floor) q.set("floor", floor);
    api<CustomerRep>(`/api/v1/manager/reports/customers?${q}`).then(setCustomers).catch(() => setCustomers(null));
  }, [tab, range, floor, from, to]);

  const excelQs =
    tab === "movement"
      ? `type=movement&range=${range}${floorParam}`
      : tab === "payment-due"
        ? `type=payment-due${floorParam}`
        : `type=customers&from=${from}&to=${to}${floorParam}`;

  return (
    <div>
      <div className="space-y-3">
        <div className="mgr-chip-row">
          <button onClick={() => setTab("movement")} className={`chip ${tab === "movement" ? "chip-active" : ""}`}>
            Kirim-chiqim
          </button>
          <button onClick={() => setTab("payment-due")} className={`chip ${tab === "payment-due" ? "chip-active" : ""}`}>
            To‘lov muddati
          </button>
          <button onClick={() => setTab("customers")} className={`chip ${tab === "customers" ? "chip-active" : ""}`}>
            Mijozlar
          </button>
          {tab === "movement"
            ? MOVEMENT_VIEWS.map((v) => (
                <button key={v.id} onClick={() => setRange(v.id)} className={`chip ${range === v.id ? "chip-active" : ""}`}>
                  {v.label}
                </button>
              ))
            : null}
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          {tab === "customers" ? (
            <>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full lg:w-auto" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full lg:w-auto" />
            </>
          ) : null}
          <FloorFilter scope="manager" value={floor} onChange={setFloor} className="w-full lg:w-auto" />
          <ExportExcelButton
            onClick={() => downloadExcel(`/api/v1/manager/reports/export/excel?${excelQs}`, `Yotoqxona_${tab}.xlsx`)}
          />
        </div>
      </div>

      {tab === "movement" ? (
        <div className="mt-5">
          <MovementTable data={movement} />
        </div>
      ) : null}

      {tab === "payment-due" ? (
        <div className="mt-5">
          <PaymentDueTable data={due} />
          {!due?.rows.length ? <EmptyState className="mt-4" title="Yashovchi mijoz yo‘q." /> : null}
        </div>
      ) : null}

      {tab === "customers" ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          </div>
          <div className="mt-5 hidden overflow-x-auto lg:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>F.I.Sh.</th>
                  <th>Qavat</th>
                  <th>Xona</th>
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
                    <td>{floorLabel(row.room.floor)}</td>
                    <td>
                      {row.room.number}/{row.bed.number}
                    </td>
                    <td>{stayTypeLabel(row.type)}</td>
                    <td className="tabular">{formatMoney(row.totalAmount)}</td>
                    <td>{row.paidDaysLabel || "—"}</td>
                    <td>{formatDate(row.dueDate)}</td>
                    <td>{payStatusLabel(row.paidAmount > 0 ? "PAID" : "UNPAID")}</td>
                    <td>{formatDate(row.startDate)}</td>
                    <td>{formatDate(checkoutDate(row))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 space-y-3 lg:hidden">
            {(customers?.rows || []).map((row, i) => (
              <article key={i} className="mgr-list-card">
                <p className="mb-2 font-semibold text-navy">{row.customer.fullName}</p>
                <div className="mgr-kv">
                  <span>Qavat</span>
                  <span>{floorLabel(row.room.floor)}</span>
                </div>
                <div className="mgr-kv">
                  <span>Xona</span>
                  <span>
                    {row.room.number}/{row.bed.number}
                  </span>
                </div>
                <div className="mgr-kv">
                  <span>Turi</span>
                  <span>{stayTypeLabel(row.type)}</span>
                </div>
                <div className="mgr-kv">
                  <span>Summa</span>
                  <span className="tabular font-semibold">{formatMoney(row.totalAmount)}</span>
                </div>
                <div className="mgr-kv">
                  <span>Davr</span>
                  <span>{row.paidDaysLabel || "—"}</span>
                </div>
                <div className="mgr-kv">
                  <span>Muddat</span>
                  <span>{formatDate(row.dueDate)}</span>
                </div>
                <div className="mgr-kv">
                  <span>Holati</span>
                  <span>{payStatusLabel(row.paidAmount > 0 ? "PAID" : "UNPAID")}</span>
                </div>
                <div className="mgr-kv">
                  <span>Kirish</span>
                  <span>{formatDate(row.startDate)}</span>
                </div>
                <div className="mgr-kv">
                  <span>Chiqish</span>
                  <span>{formatDate(checkoutDate(row))}</span>
                </div>
              </article>
            ))}
          </div>
          {!(customers?.rows || []).length ? <EmptyState className="mt-4" title="Mos mijoz yo‘q." /> : null}
        </>
      ) : null}
    </div>
  );
}
