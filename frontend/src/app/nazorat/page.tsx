"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { AddPaymentModal, type PayStay } from "@/components/AddPaymentModal";
import { EmptyState } from "@/components/EmptyState";
import { SectorFilter } from "@/components/SectorFilter";
import {
  compareRoomNumbers,
  daysLeftLabel,
  displayUzPhone,
  dueTone,
  floorLabel,
  formatDate,
  formatMoney,
  genderLabel,
  sectorLabel,
} from "@/lib/format";

type Stay = {
  id: string;
  type: string;
  startDate: string;
  monthlyPrice?: number;
  paidDays?: number | null;
  dueDate?: string | null;
  daysLeft?: number | null;
  lastPaidAt?: string | null;
};
type Bed = {
  id: string;
  number: number;
  status: string;
  occupancy?: { customer: { fullName: string; phone: string }; stay: Stay } | null;
};
type Room = {
  id: string;
  number: string;
  floor: number;
  gender: string;
  capacity: number;
  occupied: number;
  free: number;
  monthlyPrice?: number;
  sector?: { number: number; name: string } | null;
  beds: Bed[];
};

export default function SupervisorRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sector, setSector] = useState("");
  const [gender, setGender] = useState("");
  const [q, setQ] = useState("");
  const [onlyDue, setOnlyDue] = useState(false);
  const [pay, setPay] = useState<PayStay | null>(null);
  const [error, setError] = useState("");

  function load() {
    return api<Room[]>("/api/v1/reception/rooms")
      .then(setRooms)
      .catch((e) => setError(e instanceof Error ? e.message : "Xatolik"));
  }
  useEffect(() => {
    load();
  }, []);

  const living = rooms.flatMap((r) => r.beds.filter((b) => b.occupancy));
  const stats = {
    living: living.length,
    free: rooms.reduce((a, r) => a + r.free, 0),
    soon: living.filter((b) => (b.occupancy?.stay.daysLeft ?? 99) >= 0 && (b.occupancy?.stay.daysLeft ?? 99) <= 3).length,
    overdue: living.filter((b) => (b.occupancy?.stay.daysLeft ?? 0) < 0).length,
  };

  // Filtr: sektor, jins, ism yoki xona raqami; "faqat muddati yaqin" — 3 kun qolgan yoki o‘tganlar.
  const shown = useMemo(() => {
    const text = q.trim().toLowerCase();
    return rooms
      .filter((r) => (!sector || String(r.sector?.number) === sector) && (!gender || r.gender === gender))
      .filter((r) => {
        if (!text) return true;
        const names = r.beds.map((b) => b.occupancy?.customer.fullName || "").join(" ").toLowerCase();
        return r.number.toLowerCase().includes(text) || names.includes(text);
      })
      .filter((r) => !onlyDue || r.beds.some((b) => b.occupancy && (b.occupancy.stay.daysLeft ?? 99) <= 3));
  }, [rooms, sector, gender, q, onlyDue]);

  const groups = useMemo(() => {
    const map = new Map<string, Room[]>();
    for (const room of shown) {
      const key = String(room.sector?.number ?? 0);
      map.set(key, [...(map.get(key) || []), room]);
    }
    return [...map.values()]
      .map((list) => ({ sector: list[0].sector || null, list: [...list].sort((a, b) => compareRoomNumbers(a.number, b.number)) }))
      .sort((a, b) => (a.sector?.number ?? 999) - (b.sector?.number ?? 999));
  }, [shown]);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-quiet">
          <p>Yashovchilar</p>
          <strong>{stats.living}</strong>
        </div>
        <div className="stat-quiet">
          <p>Bo‘sh o‘rinlar</p>
          <strong>{stats.free}</strong>
        </div>
        <div className="stat-quiet">
          <p>Muddati yaqin (3 kun)</p>
          <strong className="text-[#7a5a00]">{stats.soon}</strong>
        </div>
        <div className="stat-quiet">
          <p>Muddati o‘tgan</p>
          <strong className="text-[#8a2f2f]">{stats.overdue}</strong>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SectorFilter scope="reception" value={sector} onChange={setSector} />
        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">Bollar va qizlar</option>
          <option value="MALE">Bollar</option>
          <option value="FEMALE">Qizlar</option>
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="F.I.Sh. yoki xona raqami" className="min-w-[200px] flex-1" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} />
          Faqat muddati yaqin
        </label>
      </div>
      {error ? <p className="mt-3 rounded-md bg-[#f8ecec] px-4 py-3 text-sm text-[#9b3b3b]">{error}</p> : null}

      <div className="mt-5 space-y-6">
        {groups.map((group) => (
          <section key={group.sector?.number ?? 0}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              {sectorLabel(group.sector)} · {group.list.length} xona · {group.list.reduce((a, r) => a + r.free, 0)} bo‘sh o‘rin
            </h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.list.map((room) => (
                <article key={room.id} className="room-card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xl font-semibold text-navy">{room.number}-xona</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {genderLabel(room.gender)} · {floorLabel(room.floor)} · {room.occupied}/{room.capacity} band
                      </p>
                    </div>
                    {room.monthlyPrice ? (
                      <p className="text-sm font-medium text-navy">{formatMoney(room.monthlyPrice)}/oy</p>
                    ) : null}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {room.beds
                      .filter((b) => b.status === "ACTIVE")
                      .map((bed) => {
                        const occ = bed.occupancy;
                        const tone = dueTone(occ?.stay.daysLeft);
                        return (
                          <li key={bed.id} className={`rounded-lg px-2.5 py-2 text-sm ${tone ? tone.cell : "bg-background"}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-navy">
                                {bed.number}-o‘rin{occ ? ` · ${occ.customer.fullName}` : ""}
                              </span>
                              {occ ? (
                                <button
                                  type="button"
                                  className="shrink-0 text-sm font-semibold text-royal"
                                  onClick={() =>
                                    setPay({
                                      id: occ.stay.id,
                                      type: occ.stay.type,
                                      monthlyPrice: occ.stay.monthlyPrice,
                                      paidDays: occ.stay.paidDays,
                                      startDate: occ.stay.startDate,
                                      customerName: occ.customer.fullName,
                                    })
                                  }
                                >
                                  To‘lov
                                </button>
                              ) : (
                                <span className="text-xs text-muted">bo‘sh</span>
                              )}
                            </div>
                            {occ ? (
                              <p className={`mt-0.5 text-xs ${tone ? tone.text : "text-muted"}`}>
                                {displayUzPhone(occ.customer.phone)} · oxirgi to‘lov {formatDate(occ.stay.lastPaidAt)} · keyingi{" "}
                                {formatDate(occ.stay.dueDate)} ({daysLeftLabel(occ.stay.daysLeft)})
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      {!groups.length ? <EmptyState className="mt-4" text="Tanlangan filtrga mos xona yo‘q." /> : null}

      {pay ? (
        <AddPaymentModal
          stay={pay}
          onClose={() => setPay(null)}
          onSaved={() => {
            setPay(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}
