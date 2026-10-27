"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EditCustomerModal } from "@/components/EditCustomerModal";
import { StatusBadge } from "@/components/StatusBadge";
import {
  checkoutDate,
  customerGenderLabel,
  dash,
  daysLeftLabel,
  displayUzPhone,
  floorLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  methodLabel,
  payStatusLabel,
  sectorLabel,
  stayTypeLabel,
} from "@/lib/format";

type Stay = {
  id: string;
  status: string;
  type: string;
  startDate: string;
  endDate?: string | null;
  paidUntil?: string | null;
  paidDays?: number | null;
  monthlyPrice?: number;
  paidAmount: number;
  room: { number: string; floor: number; sector?: { number: number; name: string } | null };
  bed: { number: number };
  checkLogs?: { id: string; type: string; at: string; note?: string | null }[];
};

type Payment = {
  id: string;
  amount: number;
  method: string;
  status: string;
  type: string;
  period?: string | null;
  paidAt: string;
  coversFrom?: string | null;
  coversTo?: string | null;
  cancelReason?: string | null;
  createdBy?: { fullName: string } | null;
  stay?: { room: { number: string }; bed: { number: number } } | null;
};

type Profile = {
  id: string;
  fullName: string;
  phone: string;
  extraPhone?: string | null;
  gender: string;
  passportId: string;
  birthDate?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  createdBy?: { fullName: string } | null;
  paid: number;
  current?: (Stay & { dueDate?: string | null; daysLeft?: number | null; paidDaysLabel?: string; overdue?: boolean }) | null;
  stays: Stay[];
  payments: Payment[];
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-medium text-navy">{children}</p>
    </div>
  );
}

export default function ReceptionCustomerProfile() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [c, setC] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [pay, setPay] = useState(false);
  const [edit, setEdit] = useState(false);
  const [drop, setDrop] = useState(false);

  const load = useCallback(
    () =>
      api<Profile>(`/api/v1/reception/customers/${params.id}`)
        .then(setC)
        .catch((e) => setError(e instanceof Error ? e.message : "Mijoz topilmadi.")),
    [params.id],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function remove() {
    setError("");
    try {
      await api(`/api/v1/reception/customers/${params.id}`, { method: "DELETE" });
      router.push("/customers");
    } catch (err) {
      setDrop(false);
      setError(err instanceof Error ? err.message : "Mijozni o‘chirib bo‘lmadi.");
    }
  }

  if (!c) {
    return error ? (
      <p className="rounded-md bg-[#f8ecec] px-4 py-3 text-sm text-[#9b3b3b]">{error}</p>
    ) : (
      <p className="text-sm text-muted">Yuklanmoqda...</p>
    );
  }

  const stay = c.current;
  const paidCount = c.payments.filter((p) => p.status === "PAID").length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/customers" className="text-sm text-royal hover:underline">
        ← Mijozlar ro‘yxati
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-navy">{c.fullName}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <StatusBadge value={stay ? "ACTIVE" : "COMPLETED"} label={stay ? "Yashaydi" : "Chiqib ketgan"} />
            {stay ? (
              <span>
                {sectorLabel(stay.room.sector)} · {stay.room.number}-xona · {stay.bed.number}-o‘rin
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {stay ? (
            <button type="button" className="btn-primary" onClick={() => setPay(true)}>
              To‘lov qo‘shish
            </button>
          ) : null}
          <button type="button" className="btn-secondary" onClick={() => setEdit(true)}>
            Tahrirlash
          </button>
          {!stay ? (
            <button type="button" className="btn-danger" onClick={() => setDrop(true)}>
              O‘chirish
            </button>
          ) : null}
        </div>
      </header>

      {error ? <p className="rounded-md bg-[#f8ecec] px-4 py-3 text-sm text-[#9b3b3b]">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-quiet">
          <p>Jami to‘langan</p>
          <strong className="text-lg">{formatMoney(c.paid)}</strong>
        </div>
        <div className="stat-quiet">
          <p>To‘lovlar soni</p>
          <strong className="text-lg">{paidCount} ta</strong>
        </div>
        <div className="stat-quiet">
          <p>To‘lov muddati</p>
          <strong className={`text-lg ${stay?.overdue ? "text-[#9b3b3b]" : ""}`}>
            {stay ? formatDate(stay.dueDate) : "—"}
          </strong>
          {stay ? <p className="mt-1 text-[11px] normal-case tracking-normal text-muted">{daysLeftLabel(stay.daysLeft)}</p> : null}
        </div>
      </div>

      <section className="card p-5">
        <h3 className="mb-4 font-semibold text-navy">Shaxsiy ma’lumotlar</h3>
        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="F.I.Sh.">{c.fullName}</Field>
          <Field label="Tug‘ilgan sana">{formatDate(c.birthDate)}</Field>
          <Field label="ID raqami">{dash(c.passportId)}</Field>
          <Field label="Telefon">{displayUzPhone(c.phone)}</Field>
          <Field label="Qo‘shimcha telefon">{c.extraPhone ? displayUzPhone(c.extraPhone) : "—"}</Field>
          <Field label="Jinsi">{customerGenderLabel(c.gender)}</Field>
          <Field label="Manzil">{c.address || "—"}</Field>
          <Field label="Ro‘yxatga olingan">
            {formatDate(c.createdAt)}
            {c.createdBy ? <span className="ml-1 font-normal text-muted">· {c.createdBy.fullName}</span> : null}
          </Field>
          <Field label="Izoh">{c.notes || "—"}</Field>
        </div>
      </section>

      {stay ? (
        <section className="card p-5">
          <h3 className="mb-4 font-semibold text-navy">Hozirgi yashash</h3>
          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Sektor">{sectorLabel(stay.room.sector)}</Field>
            <Field label="Qavat">{floorLabel(stay.room.floor)}</Field>
            <Field label="Xona / o‘rin">
              {stay.room.number}-xona · {stay.bed.number}-o‘rin
            </Field>
            <Field label="Yashash turi">{stayTypeLabel(stay.type)}</Field>
            <Field label="Kirish sanasi">{formatDate(stay.startDate)}</Field>
            <Field label="To‘langan muddat">{stay.paidDaysLabel || "—"}</Field>
            <Field label="Chiqish kuni">{formatDate(checkoutDate(stay))}</Field>
            <Field label="Qolgan kun">{daysLeftLabel(stay.daysLeft)}</Field>
            <Field label="Oylik narx">{stay.monthlyPrice ? formatMoney(stay.monthlyPrice) : "—"}</Field>
          </div>
        </section>
      ) : null}

      <section className="card p-5">
        <h3 className="mb-4 font-semibold text-navy">To‘lov tarixi</h3>
        {c.payments.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Summa</th>
                  <th>To‘lov turi</th>
                  <th>Yashash turi</th>
                  <th>Qamragan muddat</th>
                  <th>Xona</th>
                  <th>Holat</th>
                  <th>Kim kiritgan</th>
                </tr>
              </thead>
              <tbody>
                {c.payments.map((p) => (
                  <tr key={p.id} className={p.status === "CANCELLED" ? "opacity-60" : ""}>
                    <td>{formatDate(p.paidAt)}</td>
                    <td className="tabular whitespace-nowrap font-medium">{formatMoney(p.amount)}</td>
                    <td>{methodLabel(p.method)}</td>
                    <td>{stayTypeLabel(p.type)}</td>
                    <td className="whitespace-nowrap">
                      {p.coversFrom && p.coversTo ? `${formatDate(p.coversFrom)} — ${formatDate(p.coversTo)}` : dash(p.period)}
                    </td>
                    <td>{p.stay ? `${p.stay.room.number}/${p.stay.bed.number}` : "—"}</td>
                    <td>
                      <StatusBadge value={p.status} label={p.status === "CANCELLED" ? "Bekor qilingan" : payStatusLabel(p.status)} />
                      {p.cancelReason ? <p className="mt-1 text-xs text-muted">{p.cancelReason}</p> : null}
                    </td>
                    <td>{p.createdBy?.fullName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">To‘lovlar hali yo‘q.</p>
        )}
      </section>

      <section className="card p-5">
        <h3 className="mb-4 font-semibold text-navy">Yashash tarixi</h3>
        {c.stays.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sektor</th>
                  <th>Xona / o‘rin</th>
                  <th>Turi</th>
                  <th>Kirish</th>
                  <th>Chiqish</th>
                  <th>To‘langan</th>
                  <th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {c.stays.map((s) => {
                  // Kirish sanasi soatsiz saqlanadi, shuning uchun faqat chiqish vaqti ko‘rsatiladi.
                  const checkOut = s.checkLogs?.find((l) => l.type === "CHECK_OUT");
                  return (
                    <tr key={s.id}>
                      <td>{sectorLabel(s.room.sector)}</td>
                      <td>
                        {s.room.number}/{s.bed.number}
                      </td>
                      <td>{stayTypeLabel(s.type)}</td>
                      <td className="whitespace-nowrap">{formatDate(s.startDate)}</td>
                      <td className="whitespace-nowrap">
                        {checkOut ? formatDateTime(checkOut.at) : s.status === "ACTIVE" ? "—" : formatDate(s.endDate)}
                        {checkOut?.note ? <p className="mt-1 text-xs text-muted">{checkOut.note}</p> : null}
                      </td>
                      <td className="tabular whitespace-nowrap">{formatMoney(s.paidAmount)}</td>
                      <td>
                        <StatusBadge value={s.status === "ACTIVE" ? "ACTIVE" : "COMPLETED"} label={s.status === "ACTIVE" ? "Yashamoqda" : "Chiqib ketgan"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Yashash yozuvlari yo‘q.</p>
        )}
      </section>

      {pay && stay ? (
        <AddPaymentModal
          stay={{
            id: stay.id,
            type: stay.type,
            monthlyPrice: stay.monthlyPrice,
            paidDays: stay.paidDays,
            startDate: stay.startDate,
            customerName: c.fullName,
          }}
          onClose={() => setPay(false)}
          onSaved={() => {
            setPay(false);
            load();
          }}
        />
      ) : null}
      {edit ? (
        <EditCustomerModal
          customer={{ id: c.id, fullName: c.fullName, phone: c.phone, gender: c.gender }}
          onClose={() => setEdit(false)}
          onSaved={() => {
            setEdit(false);
            load();
          }}
        />
      ) : null}
      {drop ? (
        <ConfirmModal
          danger
          title="Mijozni o‘chirish"
          text={`${c.fullName} ro‘yxatdan olib tashlansinmi? To‘langan pul qaytarilmaydi: to‘lovlari va yashash tarixi hisobotlarda saqlanib qoladi.`}
          confirmLabel="O‘chirish"
          onClose={() => setDrop(false)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
