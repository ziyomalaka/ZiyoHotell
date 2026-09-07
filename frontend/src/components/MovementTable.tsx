"use client";

import { formatMoney } from "@/lib/format";

export type MovementView = "daily" | "weekly" | "monthly" | "yearly";

export type MovementData = {
  range: MovementView;
  living: number;
  totalIn: number;
  totalOut: number;
  totalIncome: number;
  rows: { key: string; label: string; in: number; out: number; net: number; income: number }[];
};

export const MOVEMENT_VIEWS: { id: MovementView; label: string }[] = [
  { id: "daily", label: "Kunlik" },
  { id: "weekly", label: "Haftalik" },
  { id: "monthly", label: "Oylik" },
  { id: "yearly", label: "Yillik" },
];

export function MovementTable({ data }: { data: MovementData | null }) {
  if (!data) return null;
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-quiet">
          <p>Kirdi</p>
          <strong>{data.totalIn}</strong>
        </div>
        <div className="stat-quiet">
          <p>Chiqdi</p>
          <strong>{data.totalOut}</strong>
        </div>
        <div className="stat-quiet">
          <p>Hozir yashayapti</p>
          <strong>{data.living}</strong>
        </div>
        <div className="stat-quiet">
          <p>Jami to‘lov</p>
          <strong className="text-lg">{formatMoney(data.totalIncome)}</strong>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Davr</th>
              <th>Kirdi</th>
              <th>Chiqdi</th>
              <th>Farq</th>
              <th>To‘lov</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td>{r.in}</td>
                <td>{r.out}</td>
                <td>{r.net}</td>
                <td className="tabular">{formatMoney(r.income)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
