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
      <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:items-center">
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
        <FloorFilter scope="manager" value={floor} onChange={setFloor} className="col-span-2 w-full lg:col-auto lg:w-auto" />
      </div>
      <p className="mt-4 text-lg font-medium text-navy">
        {months[month - 1]} {year}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 lg:gap-3">
        <div className="stat-quiet px-2 py-3 sm:px-4">
          <p className="leading-tight">Shu oy tushumi</p>
          <strong className="text-base sm:text-2xl">{formatMoney(data.total)}</strong>
        </div>
        <div className="stat-quiet px-2 py-3 sm:px-4">
          <p className="leading-tight">To‘laganlar</p>
          <strong className="text-lg sm:text-[1.45rem]">{data.paid}</strong>
        </div>
        <div className="stat-quiet px-2 py-3 sm:px-4">
          <p className="leading-tight">To‘lamaganlar</p>
          <strong className="text-lg sm:text-[1.45rem]">{data.unpaid + data.partial}</strong>
        </div>
      </div>
      <div className="mt-5 hidden overflow-x-auto lg:block">
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
      <div className="mt-5 space-y-3 lg:hidden">
        {data.stayRows.map((r) => (
          <details key={`${r.customer}-${r.room}-${r.bed}`} className="mgr-list-card">
            <summary className="min-h-11">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-navy">{r.customer}</p>
                  <p className="text-sm text-muted">{roomBedLabel(r.room, r.bed)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-base font-semibold text-navy">{formatMoney(r.totalAmount)}</p>
                  <StatusBadge value={r.payStatus === "PAID" ? "PAID" : "UNPAID"} label={payStatusLabel(r.payStatus)} />
                </div>
              </div>
            </summary>
            <div className="mt-3 border-t border-line pt-3">
              <div className="mgr-kv">
                <span>Qavat</span>
                <span>{floorLabel(r.floor)}</span>
              </div>
              <div className="mgr-kv">
                <span>Kunlik/Oylik</span>
                <span>{r.type === "DAILY" ? "Kunlik" : "Oylik"}</span>
              </div>
              <div className="mgr-kv">
                <span>Sana</span>
                <span>{formatDate(r.lastPaidAt)}</span>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
