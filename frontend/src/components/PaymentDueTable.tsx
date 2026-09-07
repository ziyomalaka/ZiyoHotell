"use client";

import { customerGenderLabel, daysLeftLabel, floorLabel, formatDate, formatMoney, stayTypeLabel } from "@/lib/format";

export type PaymentDueRow = {
  stayId: string;
  fullName: string;
  phone: string;
  gender?: string;
  floor: number;
  room: string;
  bed: number;
  type: string;
  paidDaysLabel: string;
  dueDate: string | null;
  daysLeft: number | null;
  overdue: boolean;
  dueSoon: boolean;
  monthlyPrice: number;
};

export type PaymentDueData = {
  total: number;
  overdue: number;
  dueSoon: number;
  current?: number;
  expected: number;
  rows: PaymentDueRow[];
};

export function PaymentDueTable({ data }: { data: PaymentDueData | null }) {
  if (!data) return null;
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-quiet">
          <p>Yashovchilar</p>
          <strong>{data.total}</strong>
        </div>
        <div className="stat-quiet">
          <p>Muddat yaqin (3 kun)</p>
          <strong>{data.dueSoon}</strong>
        </div>
        <div className="stat-quiet">
          <p>Muddat o‘tgan</p>
          <strong>{data.overdue}</strong>
        </div>
        <div className="stat-quiet">
          <p>Kutilayotgan to‘lov</p>
          <strong className="text-lg">{formatMoney(data.expected)}</strong>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>F.I.Sh.</th>
              <th>Telefon</th>
              <th>Jins</th>
              <th>Qavat</th>
              <th>Xona</th>
              <th>O‘rin</th>
              <th>Tur</th>
              <th>To‘langan davr</th>
              <th>Muddat</th>
              <th>Qolgan</th>
              <th>Keyingi to‘lov</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.stayId} className={r.overdue ? "bg-[#f8ecec]" : r.dueSoon ? "bg-[#f8f3e8]" : undefined}>
                <td>{r.fullName}</td>
                <td>{r.phone}</td>
                <td>{customerGenderLabel(r.gender)}</td>
                <td>{floorLabel(r.floor)}</td>
                <td>{r.room}</td>
                <td>{r.bed}</td>
                <td>{stayTypeLabel(r.type)}</td>
                <td>{r.paidDaysLabel}</td>
                <td>{formatDate(r.dueDate)}</td>
                <td>{daysLeftLabel(r.daysLeft)}</td>
                <td className="tabular">{formatMoney(r.monthlyPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
