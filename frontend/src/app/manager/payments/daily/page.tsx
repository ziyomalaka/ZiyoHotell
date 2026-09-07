"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/EmptyState";
import { FloorFilter } from "@/components/FloorFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { floorLabel, formatMoney, formatTime, payStatusLabel, stayTypeLabel } from "@/lib/format";
import { useTodayISO } from "@/components/CurrentDate";

type Row = {
  id: string;
  amount: number;
  type: string;
  status: string;
  paidAt: string;
  customer: { fullName: string };
  stay: { room: { number: string; floor: number } };
};

type Data = {
  date: string;
  paid?: number;
  unpaid?: number;
  count: number;
  total: number;
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
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <FloorFilter scope="manager" value={floor} onChange={setFloor} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="stat-quiet">
          <p>Bugungi tushum</p>
          <strong className="text-2xl">{formatMoney(data.total)}</strong>
        </div>
        <div className="stat-quiet">
          <p>Bugun to‘lagan</p>
          <strong>{data.paid ?? data.count} ta</strong>
        </div>
        <div className="stat-quiet">
          <p>To‘lamagan</p>
          <strong>{data.unpaid ?? 0} ta</strong>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>F.I.Sh.</th>
              <th>Qavat</th>
              <th>Xona</th>
              <th>Summa</th>
              <th>Kunlik/Oylik</th>
              <th>Vaqt</th>
              <th>Holati</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.customer.fullName}</td>
                <td>{floorLabel(r.stay.room.floor)}</td>
                <td>{r.stay.room.number}</td>
                <td className="tabular">{formatMoney(r.amount)}</td>
                <td>{stayTypeLabel(r.type)}</td>
                <td>{formatTime(r.paidAt)}</td>
                <td>
                  <StatusBadge value={r.status === "PAID" ? "PAID" : "UNPAID"} label={payStatusLabel(r.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
