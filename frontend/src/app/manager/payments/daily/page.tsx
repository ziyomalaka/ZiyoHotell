"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/EmptyState";
import { FloorFilter } from "@/components/FloorFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { checkoutDate, dash, displayUzPhone, floorLabel, formatDate, formatMoney, formatTime, methodLabel, payStatusLabel, stayTypeLabel } from "@/lib/format";
import { useTodayISO } from "@/components/CurrentDate";

type Row = {
  id: string;
  amount: number;
  type: string;
  method?: string;
  status: string;
  paidAt: string;
  coversTo?: string | null;
  customer: { fullName: string; phone?: string; passportId?: string };
  stay: {
    paidUntil?: string | null;
    endDate?: string | null;
    status?: string;
    room: { number: string; floor: number };
  };
};

type Data = {
  date: string;
  paid?: number;
  unpaid?: number;
  count: number;
  total: number;
  cash?: number;
  card?: number;
  rows: Row[];
};

export default function ManagerDailyPaymentsPage() {
  const today = useTodayISO();
  const [date, setDate] = useState("");
  const [floor, setFloor] = useState("");
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    if (today) setDate((prev) => prev || today);
  }, [today]);

  useEffect(() => {
    if (!date) return;
    api<Data>(`/api/v1/manager/payments/daily?date=${date}${floor ? `&floor=${floor}` : ""}`).then(setData);
  }, [date, floor]);

  if (!data) return <LoadingSkeleton />;

  return (
    <div>
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full lg:w-auto" />
        <FloorFilter scope="manager" value={floor} onChange={setFloor} className="w-full lg:w-auto" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
        <div className="stat-quiet px-2 py-3 sm:px-4">
          <p className="leading-tight">Bugungi tushum</p>
          <strong className="text-base sm:text-2xl">{formatMoney(data.total)}</strong>
        </div>
        <div className="stat-quiet px-2 py-3 sm:px-4">
          <p className="leading-tight">Naqd</p>
          <strong className="text-base sm:text-2xl">{formatMoney(data.cash || 0)}</strong>
        </div>
        <div className="stat-quiet px-2 py-3 sm:px-4">
          <p className="leading-tight">Karta</p>
          <strong className="text-base sm:text-2xl">{formatMoney(data.card || 0)}</strong>
        </div>
        <div className="stat-quiet px-2 py-3 sm:px-4">
          <p className="leading-tight">Bugun to‘lagan</p>
          <strong className="text-lg sm:text-[1.45rem]">{data.paid ?? data.count} ta</strong>
        </div>
        <div className="stat-quiet px-2 py-3 sm:px-4">
          <p className="leading-tight">To‘lamagan</p>
          <strong className="text-lg sm:text-[1.45rem]">{data.unpaid ?? 0} ta</strong>
        </div>
      </div>
      <div className="mt-5 hidden overflow-x-auto lg:block">
        <table className="data-table">
          <thead>
            <tr>
              <th>F.I.Sh.</th>
              <th>Telefon</th>
              <th>ID raqami</th>
              <th>Qavat</th>
              <th>Xona</th>
              <th>Summa</th>
              <th>Usul</th>
              <th>Kunlik/Oylik</th>
              <th>Chiqish kuni</th>
              <th>Vaqt</th>
              <th>Holati</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.customer.fullName}</td>
                <td>{displayUzPhone(r.customer.phone)}</td>
                <td>{dash(r.customer.passportId)}</td>
                <td>{floorLabel(r.stay.room.floor)}</td>
                <td>{r.stay.room.number}</td>
                <td className="tabular">{formatMoney(r.amount)}</td>
                <td>{methodLabel(r.method || "")}</td>
                <td>{stayTypeLabel(r.type)}</td>
                <td>{formatDate(r.coversTo || checkoutDate(r.stay))}</td>
                <td>{formatTime(r.paidAt)}</td>
                <td>
                  <StatusBadge value={r.status === "PAID" ? "PAID" : "UNPAID"} label={payStatusLabel(r.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 space-y-3 lg:hidden">
        {data.rows.map((r) => (
          <details key={r.id} className="mgr-list-card">
            <summary className="min-h-11">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-navy">{r.customer.fullName}</p>
                  <p className="text-sm text-muted">{r.stay.room.number}-xona</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-base font-semibold text-navy">{formatMoney(r.amount)}</p>
                  <StatusBadge value={r.status === "PAID" ? "PAID" : "UNPAID"} label={payStatusLabel(r.status)} />
                </div>
              </div>
            </summary>
            <div className="mt-3 border-t border-line pt-3">
              <div className="mgr-kv">
                <span>Telefon</span>
                <span>{displayUzPhone(r.customer.phone)}</span>
              </div>
              <div className="mgr-kv">
                <span>ID raqami</span>
                <span>{dash(r.customer.passportId)}</span>
              </div>
              <div className="mgr-kv">
                <span>Qavat</span>
                <span>{floorLabel(r.stay.room.floor)}</span>
              </div>
              <div className="mgr-kv">
                <span>Usul</span>
                <span>{methodLabel(r.method || "")}</span>
              </div>
              <div className="mgr-kv">
                <span>Kunlik/Oylik</span>
                <span>{stayTypeLabel(r.type)}</span>
              </div>
              <div className="mgr-kv">
                <span>Chiqish kuni</span>
                <span>{formatDate(r.coversTo || checkoutDate(r.stay))}</span>
              </div>
              <div className="mgr-kv">
                <span>Vaqt</span>
                <span>{formatTime(r.paidAt)}</span>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
