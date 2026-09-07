"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { FloorFilter } from "@/components/FloorFilter";
import { BedCard, RoomCard } from "@/components/RoomVisual";
import { compareRoomNumbers, formatDate, formatMoney, genderLabel } from "@/lib/format";

type Stay = { startDate: string; type: string; paidAmount: number; totalAmount: number };
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
  kind: string;
  status: string;
  beds: Bed[];
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [floor, setFloor] = useState("");
  const [gender, setGender] = useState("");
  const [open, setOpen] = useState<Room | null>(null);
  const [guest, setGuest] = useState<Bed | null>(null);

  useEffect(() => {
    api<Room[]>("/api/v1/reception/rooms").then(setRooms);
  }, []);

  const shown = useMemo(() => {
    return rooms.filter((r) => {
      const text = `${r.number} ${r.beds.map((b) => b.occupancy?.customer.fullName || "").join(" ")}`.toLowerCase();
      if (q && !text.includes(q.toLowerCase())) return false;
      if (floor && String(r.floor) !== floor) return false;
      if (gender && r.gender !== gender) return false;
      if (filter === "empty" && r.kind !== "empty") return false;
      if (filter === "partial" && r.kind !== "partial") return false;
      if (filter === "full" && r.kind !== "full") return false;
      return true;
    });
  }, [rooms, q, filter, floor, gender]);

  const freeBeds = shown.reduce((acc, r) => acc + r.free, 0);

  // Har bir qavatning bollar va qizlar bloki alohida bo‘lim:
  // raqamlar bloklar orasida takrorlanishi mumkin, shuning uchun jins sarlavhada ko‘rsatiladi.
  const roomGroups = useMemo(() => {
    const groups = new Map<string, Room[]>();
    for (const room of shown) {
      const key = `${room.floor || 0}|${room.gender}`;
      groups.set(key, [...(groups.get(key) || []), room]);
    }
    return [...groups.entries()]
      .map(([key, list]) => ({
        key,
        level: Number(key.split("|")[0]),
        gender: key.split("|")[1],
        list: [...list].sort((a, b) => compareRoomNumbers(a.number, b.number)),
        free: list.reduce((acc, r) => acc + r.free, 0),
      }))
      .sort((a, b) => a.level - b.level || (a.gender === b.gender ? 0 : a.gender === "MALE" ? -1 : 1));
  }, [shown]);

  return (
    <div>
      <FilterBar>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Xona yoki mijoz" className="min-w-[180px] flex-1" />
        <FloorFilter scope="reception" value={floor} onChange={setFloor} />
        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">Bollar va qizlar</option>
          <option value="MALE">Bollar xonalari</option>
          <option value="FEMALE">Qizlar xonalari</option>
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Barchasi</option>
          <option value="empty">Bo‘sh</option>
          <option value="partial">Qisman band</option>
          <option value="full">To‘liq band</option>
        </select>
        <span className="text-sm text-muted">
          {shown.length} xona · {freeBeds} bo‘sh o‘rin
        </span>
      </FilterBar>
      {shown.length ? (
        <div className="space-y-6">
          {roomGroups.map((group) => (
            <section key={group.key}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted">
                {group.level ? `${group.level}-qavat` : "Qavat belgilanmagan"} · {genderLabel(group.gender)} ·{" "}
                {group.list.length} xona · {group.free} bo‘sh o‘rin
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {group.list.map((room) => (
                  <RoomCard
                    key={room.id}
                    number={room.number}
                    floor={room.floor}
                    gender={room.gender}
                    capacity={room.capacity}
                    occupied={room.occupied}
                    free={room.free}
                    kind={room.kind}
                    status={room.status}
                    beds={room.beds}
                    onClick={() => setOpen(room)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title={rooms.length ? "Mos xona topilmadi." : "Hozircha xona yo‘q."}
          text={rooms.length ? "Tanlangan filterga mos xona yo‘q." : "Dasturiy admin xona qo‘shgach, shu yerda chiqadi."}
        />
      )}
      {open ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            setOpen(null);
            setGuest(null);
          }}
        >
          <div className="surface max-h-[90vh] w-full max-w-lg overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold text-navy">{open.number}-xona</h2>
            <p className="mt-1 text-sm text-muted">
              {open.floor ? `${open.floor}-qavat · ` : ""}
              {genderLabel(open.gender)} · {open.capacity} ta o‘rin · {open.occupied} band · {open.free} bo‘sh
            </p>
            <div className="mt-4 space-y-2">
              {open.beds.map((bed) => (
                <BedCard
                  key={bed.id}
                  number={bed.number}
                  occupied={!!bed.occupancy}
                  guest={bed.occupancy?.customer.fullName}
                  onClick={() => bed.occupancy && setGuest(bed)}
                />
              ))}
            </div>
            {guest?.occupancy ? (
              <div className="mt-4 rounded-xl bg-background p-4 text-sm">
                <p className="font-semibold text-navy">{guest.occupancy.customer.fullName}</p>
                <p>{guest.occupancy.customer.phone}</p>
                <p>Kirish: {formatDate(guest.occupancy.stay.startDate)}</p>
                <p>{guest.occupancy.stay.type === "DAILY" ? "Kunlik" : "Oylik"}</p>
                <p className="tabular">
                  To‘lov: {formatMoney(guest.occupancy.stay.paidAmount)} / {formatMoney(guest.occupancy.stay.totalAmount)}
                </p>
              </div>
            ) : null}
            <button
              className="btn-secondary mt-4"
              onClick={() => {
                setOpen(null);
                setGuest(null);
              }}
            >
              Yopish
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
