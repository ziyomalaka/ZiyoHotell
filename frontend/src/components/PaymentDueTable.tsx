"use client";

import { customerGenderLabel, dash, displayUzPhone, daysLeftLabel, floorLabel, formatDate, formatMoney, sectorLabel, stayTypeLabel } from "@/lib/format";

export type PaymentDueRow = {
  stayId: string;
  fullName: string;
  phone: string;
  passportId?: string; birthDate?: string | null;
  gender?: string;
  floor: number;
  sector?: { number: number; name: string } | null;
  room: string;
  bed: number;
  type: string;
  startDate?: string;
  paidDays?: number | null;
  paidDaysLabel: string;
  lastPaidAt?: string | null;
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

/** Qisqa joy nomi: sektor bo‘lsa "2-sektor", aks holda qavat. */
function placeLabel(r: PaymentDueRow) {
  return r.sector ? `${r.sector.number}-sektor` : floorLabel(r.floor);
}

export function PaymentDueTable({ data, onPay }: { data: PaymentDueData | null; onPay?: (row: PaymentDueRow) => void }) {
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
              <th>Tug‘ilgan sana</th>
              <th>Jins</th>
              <th>Sektor</th>
              <th>Xona</th>
              <th>O‘rin</th>
              <th>Tur</th>
              <th>To‘langan davr</th>
              <th>Oxirgi to‘lov</th>
              <th>Keyingi to‘lov sanasi</th>
              <th>Qolgan</th>
              <th>Keyingi to‘lov summasi</th>
              {onPay ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.stayId} className={r.overdue ? "bg-[#f8ecec]" : r.dueSoon ? "bg-[#f8f3e8]" : undefined}>
                <td>{r.fullName}</td>
                <td>{displayUzPhone(r.phone)}</td>
                <td>{dash(r.passportId)}</td>
                <td>{formatDate(r.birthDate)}</td>
                <td>{customerGenderLabel(r.gender)}</td>
                <td title={sectorLabel(r.sector)}>{placeLabel(r)}</td>
                <td>{r.room}</td>
                <td>{r.bed}</td>
                <td>{stayTypeLabel(r.type)}</td>
                <td>{r.paidDaysLabel}</td>
                <td>{formatDate(r.lastPaidAt)}</td>
                <td>{formatDate(r.dueDate)}</td>
                <td>{daysLeftLabel(r.daysLeft)}</td>
                <td className="tabular">{formatMoney(r.monthlyPrice)}</td>
                {onPay ? (
                  <td>
                    <button type="button" className="text-sm font-semibold text-royal" onClick={() => onPay(r)}>
                      To‘lov
                    </button>
                  </td>
                ) : null}
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
              <span>Tug‘ilgan sana</span>
              <span>{formatDate(r.birthDate)}</span>
            </div>
            <div className="mgr-kv">
              <span>Jins</span>
              <span>{customerGenderLabel(r.gender)}</span>
            </div>
            <div className="mgr-kv">
              <span>Joy</span>
              <span>
                {placeLabel(r)} · {r.room}-xona · {r.bed}-o‘rin
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
              <span>Oxirgi to‘lov</span>
              <span>{formatDate(r.lastPaidAt)}</span>
            </div>
            <div className="mgr-kv">
              <span>Keyingi to‘lov sanasi</span>
              <span>{formatDate(r.dueDate)}</span>
            </div>
            <div className="mgr-kv">
              <span>Qolgan</span>
              <span>{daysLeftLabel(r.daysLeft)}</span>
            </div>
            <div className="mgr-kv">
              <span>Keyingi to‘lov summasi</span>
              <span className="tabular font-semibold">{formatMoney(r.monthlyPrice)}</span>
            </div>
            {onPay ? (
              <button type="button" className="btn-primary mt-3 w-full" onClick={() => onPay(r)}>
                To‘lov qabul qilish
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
