"use client";

import { customerGenderLabel, dash, displayUzPhone, daysLeftLabel, floorLabel, formatDate, formatMoney, stayTypeLabel } from "@/lib/format";

export type PaymentDueRow = {
  stayId: string;
  fullName: string;
  phone: string;
  passportId?: string;
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
      <div className="mt-4 hidden overflow-x-auto lg:block">
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
              <th>Tur</th>
              <th>To‘langan davr</th>
              <th>Chiqish kuni</th>
              <th>Qolgan</th>
              <th>Keyingi to‘lov</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.stayId} className={r.overdue ? "bg-[#f8ecec]" : r.dueSoon ? "bg-[#f8f3e8]" : undefined}>
                <td>{r.fullName}</td>
                <td>{displayUzPhone(r.phone)}</td>
                <td>{dash(r.passportId)}</td>
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
      <div className="mt-4 space-y-3 lg:hidden">
        {data.rows.map((r) => (
          <article
            key={r.stayId}
            className={`mgr-list-card ${r.overdue ? "bg-[#f8ecec]" : r.dueSoon ? "bg-[#f8f3e8]" : ""}`}
          >
            <p className="mb-2 font-semibold text-navy">{r.fullName}</p>
            <div className="mgr-kv">
              <span>Telefon</span>
              <span>{displayUzPhone(r.phone)}</span>
            </div>
            <div className="mgr-kv">
              <span>ID raqami</span>
              <span>{dash(r.passportId)}</span>
            </div>
            <div className="mgr-kv">
              <span>Jins</span>
              <span>{customerGenderLabel(r.gender)}</span>
            </div>
            <div className="mgr-kv">
              <span>Joy</span>
              <span>
                {floorLabel(r.floor)} · {r.room}-xona · {r.bed}-o‘rin
              </span>
            </div>
            <div className="mgr-kv">
              <span>Tur</span>
              <span>{stayTypeLabel(r.type)}</span>
            </div>
            <div className="mgr-kv">
              <span>Davr</span>
              <span>{r.paidDaysLabel}</span>
            </div>
            <div className="mgr-kv">
              <span>Chiqish kuni</span>
              <span>{formatDate(r.dueDate)}</span>
            </div>
            <div className="mgr-kv">
              <span>Qolgan</span>
              <span>{daysLeftLabel(r.daysLeft)}</span>
            </div>
            <div className="mgr-kv">
              <span>Keyingi to‘lov</span>
              <span className="tabular font-semibold">{formatMoney(r.monthlyPrice)}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
