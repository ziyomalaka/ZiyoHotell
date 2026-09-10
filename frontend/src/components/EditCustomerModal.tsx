"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { IdNumberInput } from "@/components/IdNumberInput";
import { PhoneInput } from "@/components/PhoneInput";
import { formatPassportId, formatUzPhone, isValidPassportId, isValidUzPhone, todayISO } from "@/lib/format";

export type EditCustomerSeed = {
  id: string;
  fullName: string;
  phone: string;
  gender: string;
};

type Detail = {
  fullName: string;
  phone: string;
  gender: string;
  notes?: string | null;
  extraPhone?: string | null;
  address?: string | null;
  passportId?: string | null;
  birthDate?: string | null;
};

export function EditCustomerModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: EditCustomerSeed;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    fullName: customer.fullName,
    phone: formatUzPhone(customer.phone),
    gender: customer.gender === "FEMALE" ? "FEMALE" : "MALE",
    extraPhone: "",
    address: "",
    passportId: "",
    birthDate: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<Detail>(`/api/v1/reception/customers/${customer.id}`)
      .then((row) => {
        setForm({
          fullName: row.fullName,
          phone: formatUzPhone(row.phone),
          gender: row.gender === "FEMALE" ? "FEMALE" : "MALE",
          extraPhone: formatUzPhone(row.extraPhone || ""),
          address: row.address || "",
          passportId: formatPassportId(row.passportId || ""),
          birthDate: row.birthDate ? todayISO(row.birthDate) : "",
          notes: row.notes || "",
        });
      })
      .catch(() => null)
      .finally(() => setReady(true));
  }, [customer.id]);

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.fullName.trim()) {
      setError("F.I.Sh. majburiy.");
      return;
    }
    if (!isValidPassportId(form.passportId)) {
      setError("ID raqami 2 ta harf va 7 ta raqam bo‘lishi kerak. Masalan: AA1234567.");
      return;
    }
    if (!isValidUzPhone(form.phone) || !isValidUzPhone(form.extraPhone)) {
      setError("Telefon raqami +998 dan keyin 9 ta raqam bo‘lishi kerak.");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/v1/reception/customers/${customer.id}`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          gender: form.gender,
          extraPhone: form.extraPhone.trim(),
          address: form.address.trim(),
          passportId: form.passportId.trim(),
          birthDate: form.birthDate,
          notes: form.notes.trim(),
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saqlanmadi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="surface w-full max-w-md p-6" onSubmit={submit}>
        <h2 className="text-lg font-semibold text-navy">Mijozni tahrirlash</h2>
        <label className="mt-4 block text-sm font-medium">
          F.I.Sh.
          <input required value={form.fullName} onChange={(e) => patch("fullName", e.target.value)} className="mt-2 w-full" />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Telefon
          <PhoneInput value={form.phone} onChange={(value) => patch("phone", value)} className="mt-2 w-full" />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Jinsi
          <select value={form.gender} onChange={(e) => patch("gender", e.target.value)} className="mt-2 w-full">
            <option value="MALE">Bola</option>
            <option value="FEMALE">Qiz</option>
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium">
          Qo‘shimcha telefon
          <PhoneInput value={form.extraPhone} onChange={(value) => patch("extraPhone", value)} className="mt-2 w-full" />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Manzil
          <input value={form.address} onChange={(e) => patch("address", e.target.value)} className="mt-2 w-full" />
        </label>
        <label className="mt-3 block text-sm font-medium">
          ID raqami
          <IdNumberInput value={form.passportId} onChange={(value) => patch("passportId", value)} className="mt-2 w-full uppercase" />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Tug‘ilgan sana
          <input type="date" value={form.birthDate} onChange={(e) => patch("birthDate", e.target.value)} className="mt-2 w-full" />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Izoh
          <textarea value={form.notes} onChange={(e) => patch("notes", e.target.value)} className="mt-2 w-full" />
        </label>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Bekor qilish
          </button>
          <button className="btn-primary" disabled={saving || !ready}>
            {saving ? "Saqlanmoqda..." : "SAQLASH"}
          </button>
        </div>
      </form>
    </div>
  );
}
