"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate, formatMoney, payStatusLabel, stayTypeLabel } from "@/lib/format";

type Profile = {
  fullName: string;
  phone: string;
  passportId: string;
  address?: string | null;
  paid: number;
  debt: number;
  occupancy?: { stay: { startDate: string; type: string; room: { number: string }; bed: { number: number } } } | null;
  stays: {
    id: string;
    startDate: string;
    endDate?: string | null;
    status: string;
    type: string;
    room: { number: string };
    bed: { number: number };
    totalAmount: number;
    paidAmount: number;
    checkLogs: { type: string; at: string }[];
  }[];
  payments: { id: string; amount: number; paidAt: string; status: string; period: string }[];
};

export default function ManagerCustomerProfile() {
  const params = useParams<{ id: string }>();
  const [c, setC] = useState<Profile | null>(null);
  useEffect(() => {
    api<Profile>(`/api/v1/manager/customers/${params.id}`).then(setC);
  }, [params.id]);
  if (!c) return <p>Yuklanmoqda...</p>;
  const stay = c.occupancy?.stay;
  return (
    <div className="space-y-5">
      <h1 className="sr-only">{c.fullName}</h1>
      <section className="grid gap-3 card p-5 text-sm sm:grid-cols-2">
        <p>Telefon: {c.phone}</p>
        <p>Pasport / ID: {c.passportId}</p>
        <p>Manzil: {c.address || "—"}</p>
        <p>Xona / o‘rin: {stay ? `${stay.room.number}/${stay.bed.number}` : "—"}</p>
        <p>Kirish sanasi: {stay ? formatDate(stay.startDate) : "—"}</p>
        <p>Yashash turi: {stay ? stayTypeLabel(stay.type) : "—"}</p>
        <p>Jami to‘langan: {formatMoney(c.paid)}</p>
        <p>Qarzdorlik: {formatMoney(c.debt)}</p>
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">Kirish / chiqish tarixi</h2>
        {c.stays.map((s) => (
          <p key={s.id} className="mt-2 text-sm">
            {s.room.number}/{s.bed.number} · {formatDate(s.startDate)}
            {s.endDate ? ` — ${formatDate(s.endDate)}` : ""} · {s.status === "ACTIVE" ? "Yashamoqda" : "Chiqib ketgan"} · {stayTypeLabel(s.type)}
          </p>
        ))}
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">To‘lov tarixi</h2>
        {c.payments.map((p) => (
          <p key={p.id} className="mt-2 text-sm">
            {formatDate(p.paidAt)} · {formatMoney(p.amount)} · {p.period} · {payStatusLabel(p.status)}
          </p>
        ))}
      </section>
    </div>
  );
}
