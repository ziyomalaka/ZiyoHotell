"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/EmptyState";
import { FloorFilter } from "@/components/FloorFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { floorLabel, formatDate, formatMoney, payStatusLabel, roomBedLabel } from "@/lib/format";
import { useTodayISO } from "@/components/CurrentDate";

type StayRow = {
  customer: string;
  room: string;
  floor: number | null;
  bed: number;
  totalAmount: number;
  payStatus: string;
  lastPaidAt: string | null;
  type?: string;
};

type Data = {
  year: number;
  month: number;
  total: number;
  paid: number;
  unpaid: number;
  partial: number;
  stayRows: StayRow[];
};

const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

export default function ManagerMonthlyPaymentsPage() {
  const today = useTodayISO();
  const [year, setYear] = useState(0);
  const [month, setMonth] = useState(0);
  const [floor, setFloor] = useState("");
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    if (!today) return;
    setYear((prev) => prev || Number(today.slice(0, 4)));
    setMonth((prev) => prev || Number(today.slice(5, 7)));
  }, [today]);

  useEffect(() => {
    if (!year || !month) return;
    api<Data>(
      `/api/v1/manager/payments/monthly?year=${year}&month=${month}${floor ? `&floor=${floor}` : ""}`,
    ).then(setData);
  }, [year, month, floor]);

  if (!data) return <LoadingSkeleton />;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {months.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].filter((y, i, a) => a.indexOf(y) === i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <FloorFilter scope="manager" value={floor} onChange={setFloor} />
      </div>
      <p className="mt-4 text-lg font-medium text-navy">
        {months[month - 1]} {year}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="stat-quiet">
          <p>Shu oy tushumi</p>
          <strong className="text-2xl">{formatMoney(data.total)}</strong>
        </div>
        <div className="stat-quiet">
          <p>To‘laganlar</p>
          <strong>{data.paid}</strong>
        </div>
        <div className="stat-quiet">
          <p>To‘lamaganlar</p>
          <strong>{data.unpaid + data.partial}</strong>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mijoz</th>
              <th>Qavat</th>
              <th>Xona</th>
              <th>Kunlik/Oylik</th>
              <th>Summa</th>
              <th>Holati</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {data.stayRows.map((r) => (
              <tr key={`${r.customer}-${r.room}-${r.bed}`}>
                <td>{r.customer}</td>
                <td>{floorLabel(r.floor)}</td>
                <td>{roomBedLabel(r.room, r.bed)}</td>
                <td>{r.type === "DAILY" ? "Kunlik" : "Oylik"}</td>
                <td className="tabular">{formatMoney(r.totalAmount)}</td>
                <td>
                  <StatusBadge value={r.payStatus === "PAID" ? "PAID" : "UNPAID"} label={payStatusLabel(r.payStatus)} />
                </td>
                <td>{formatDate(r.lastPaidAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
