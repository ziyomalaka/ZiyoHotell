"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { customerGenderLabel, dash, displayUzPhone, floorLabel, formatDate, formatMoney } from "@/lib/format";

type Profile = {
  fullName: string;
  phone: string;
  gender: string;
  passportId: string;
  address?: string | null;
  debt: number;
  occupancy?: { stay: { room: { number: string; floor: number }; bed: { number: number } } } | null;
  stays: {
    id: string;
    startDate: string;
    status: string;
    room: { number: string; floor: number };
    bed: { number: number };
    totalAmount: number;
    paidAmount: number;
  }[];
  payments: { id: string; amount: number; paidAt: string; status: string }[];
  audits: { id: string; action: string; createdAt: string; user: { fullName: string } }[];
};

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const [c, setC] = useState<Profile | null>(null);
  useEffect(() => {
    api<Profile>(`/api/v1/admin/customers/${params.id}`).then(setC);
  }, [params.id]);
  if (!c) return <p>Yuklanmoqda...</p>;
  return (
    <div className="space-y-5">
      <h1 className="sr-only">{c.fullName}</h1>
      <section className="card p-5 text-sm">
        <p>Telefon: {displayUzPhone(c.phone)}</p>
        <p>Jins: {customerGenderLabel(c.gender)}</p>
        <p>ID raqami: {dash(c.passportId)}</p>
        <p>Manzil: {c.address || "—"}</p>
        <p>
          Qavat / xona / o‘rin:{" "}
          {c.occupancy
            ? `${floorLabel(c.occupancy.stay.room.floor)} · ${c.occupancy.stay.room.number}/${c.occupancy.stay.bed.number}`
            : "—"}
        </p>
        <p>Qarzdorlik: {formatMoney(c.debt)}</p>
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">Yashash / kirish-chiqish</h2>
        {c.stays.map((s) => (
          <p key={s.id} className="mt-2 text-sm">
            {floorLabel(s.room.floor)} · {s.room.number}/{s.bed.number} · {formatDate(s.startDate)} · {s.status} ·{" "}
            {formatMoney(s.paidAmount)}/{formatMoney(s.totalAmount)}
          </p>
        ))}
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">To‘lovlar</h2>
        {c.payments.map((p) => (
          <p key={p.id} className="mt-2 text-sm">{formatDate(p.paidAt)} · {formatMoney(p.amount)} · {p.status}</p>
        ))}
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">Audit</h2>
        {c.audits.map((a) => (
          <p key={a.id} className="mt-2 text-sm text-muted">{formatDate(a.createdAt)} · {a.user.fullName} · {a.action}</p>
        ))}
      </section>
    </div>
  );
}
