"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { daysLeftLabel, floorLabel, formatDate, formatMoney } from "@/lib/format";

type Reminder = {
  id: string;
  fullName: string;
  phone: string;
  floor: number;
  room: string;
  bed: number;
  dueDate: string;
  daysLeft: number;
  amount: number;
  message: string;
  readAt: string | null;
};

type List = { unread: number; rows: Reminder[] };

export function ReminderBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<List>({ unread: 0, rows: [] });

  async function load() {
    try {
      setData(await api<List>("/api/v1/reminders"));
    } catch {
      /* sessiya yo‘q yoki rol eslatmani ko‘rmaydi */
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  async function markAll() {
    try {
      await api("/api/v1/reminders/read-all", { method: "POST" });
      await load();
    } catch {
      /* o‘qilgan qilish shart emas — keyingi yuklashda qayta uriniladi */
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative hidden h-9 w-9 items-center justify-center rounded-full border border-line text-navy sm:inline-flex"
        title="To‘lov muddati eslatmalari"
        aria-label="Eslatmalar"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9zm6 13a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2z" />
        </svg>
        {data.unread ? (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#9b3b3b] px-1 text-[10px] font-semibold leading-[18px] text-white">
            {data.unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(92vw,28rem)] rounded-xl border border-line bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-navy">To‘lov muddati</p>
            {data.unread ? (
              <button type="button" className="text-xs text-muted hover:text-navy" onClick={markAll}>
                Barchasini o‘qilgan qilish
              </button>
            ) : null}
          </div>
          {data.rows.length ? (
            <ul className="max-h-80 space-y-2 overflow-auto">
              {data.rows.map((r) => (
                <li key={r.id} className="rounded-lg bg-background px-3 py-2 text-sm">
                  <p className="font-medium text-navy">{r.fullName}</p>
                  <p className="text-xs text-muted">
                    {floorLabel(r.floor)} · {r.room}-xona · {r.bed}-o‘rin
                  </p>
                  <p className={r.daysLeft < 0 ? "text-[#9b3b3b]" : "text-navy"}>
                    {daysLeftLabel(r.daysLeft)} · {formatDate(r.dueDate)} · {formatMoney(r.amount)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Bugun eslatma yo‘q.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
