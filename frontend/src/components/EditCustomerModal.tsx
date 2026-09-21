"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { IdNumberInput } from "@/components/IdNumberInput";
import { PhoneInput } from "@/components/PhoneInput";
import { floorLabel, formatPassportId, formatUzPhone, isValidPassportId, isValidUzPhone, todayISO } from "@/lib/format";

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
  occupancy?: {
    stay: StayPlace;
  } | null;
  stays?: StayPlace[];
};

type StayPlace = {
  id?: string;
  status?: string;
  bedId: string;
  roomId: string;
  bed: { id: string; number: number };
  room: { id: string; number: string; floor: number; gender: string };
};

type Room = {
  id: string;
  number: string;
  floor?: number | null;
  gender: string;
  status: string;
  beds: { id: string; number: number; status: string; occupancy?: { customerId?: string; customer?: { id?: string } } | null }[];
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
    floor: "",
    roomId: "",
    bedId: "",
  });
  const [living, setLiving] = useState(false);
  const [currentBedId, setCurrentBedId] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Detail>(`/api/v1/reception/customers/${customer.id}`),
      api<Room[]>("/api/v1/reception/rooms"),
    ])
      .then(([row, list]) => {
        const stay = row.occupancy?.stay || row.stays?.[0];
        const gender = row.gender === "FEMALE" ? "FEMALE" : "MALE";
        const ownerOf = (bed: Room["beds"][number]) => bed.occupancy?.customerId || bed.occupancy?.customer?.id;
        const isFree = (bed: Room["beds"][number]) =>
          bed.status === "ACTIVE" && (!bed.occupancy || ownerOf(bed) === customer.id);
        const bedId = stay?.bedId || stay?.bed.id || "";
        const roomId = stay?.roomId || stay?.room.id || "";
        const floor = stay?.room.floor ? String(stay.room.floor) : "";
        const room = list.find((r) => r.id === roomId);
        const bed = room?.beds.find((b) => b.id === bedId);
        const roomOk =
          !!room && room.status === "ACTIVE" && room.gender === gender && room.beds.some(isFree);
        const floorOk =
          !!floor &&
          list.some(
            (r) => r.status === "ACTIVE" && r.gender === gender && String(r.floor) === floor && r.beds.some(isFree),
          );
        setLiving(!!row.occupancy?.stay);
        setCurrentBedId(bed && isFree(bed) ? bedId : "");
        setRooms(list);
        setForm({
          fullName: row.fullName,
          phone: formatUzPhone(row.phone),
          gender,
          extraPhone: formatUzPhone(row.extraPhone || ""),
          address: row.address || "",
          passportId: formatPassportId(row.passportId || ""),
          birthDate: row.birthDate ? todayISO(row.birthDate) : "",
          notes: row.notes || "",
          floor: floorOk ? floor : "",
          roomId: roomOk ? roomId : "",
          bedId: bed && isFree(bed) ? bedId : "",
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Ma’lumot yuklanmadi."))
      .finally(() => setReady(true));
  }, [customer.id]);

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "gender") {
        next.floor = "";
        next.roomId = "";
        next.bedId = "";
      }
      if (key === "floor") {
        next.roomId = "";
        next.bedId = "";
      }
      if (key === "roomId") next.bedId = "";
      return next;
    });
  }

  function bedFree(bed: Room["beds"][number]) {
    const owner = bed.occupancy?.customerId || bed.occupancy?.customer?.id;
    return bed.status === "ACTIVE" && (!bed.occupancy || owner === customer.id);
  }

  const genderRooms = useMemo(
    () => rooms.filter((r) => r.status === "ACTIVE" && r.gender === form.gender),
    [rooms, form.gender],
  );
  const floors = useMemo(
    () => [...new Set(genderRooms.map((r) => r.floor).filter((n): n is number => Number.isInteger(n) && n >= 1))].sort((a, b) => a - b),
    [genderRooms],
  );
  const floorRooms = useMemo(
    () =>
      genderRooms.filter((r) => {
        if (!form.floor || String(r.floor) !== form.floor) return false;
        return r.beds.some((b) => bedFree(b));
      }),
    [genderRooms, form.floor, customer.id],
  );
  const room = floorRooms.find((r) => r.id === form.roomId);
  const freeBeds = (room?.beds || []).filter((b) => bedFree(b));

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
    if (!form.bedId || !freeBeds.some((b) => b.id === form.bedId)) {
      setError("Bo‘sh o‘rin tanlang.");
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
          bedId: form.bedId,
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
      <form className="surface max-h-[90vh] w-full max-w-md overflow-y-auto p-6" onSubmit={submit}>
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
          Qavat
          <select value={form.floor} onChange={(e) => patch("floor", e.target.value)} className="mt-2 w-full">
            <option value="">Tanlang</option>
            {floors.map((n) => (
              <option key={n} value={String(n)}>
                {floorLabel(n)}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium">
          Xona
          <select value={form.roomId} onChange={(e) => patch("roomId", e.target.value)} className="mt-2 w-full">
            <option value="">{form.floor ? "Tanlang" : "Avval qavat tanlang"}</option>
            {floorRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number}-xona
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium">
          O‘rin
          <select value={form.bedId} onChange={(e) => patch("bedId", e.target.value)} className="mt-2 w-full">
            <option value="">{form.roomId ? "Bo‘sh o‘rin" : "Avval xona tanlang"}</option>
            {freeBeds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.number}-o‘rin{b.id === currentBedId ? " — HOZIRGI" : " — BO‘SH"}
              </option>
            ))}
          </select>
        </label>
        {!living ? (
          <p className="mt-1 text-xs text-muted">Faqat bo‘sh o‘rinlar. Saqlangach mijoz yozuvi hamma joyda yangilanadi.</p>
        ) : null}
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
