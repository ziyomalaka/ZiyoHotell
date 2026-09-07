"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ConfirmModal } from "@/components/ConfirmModal";
import { FloorFilter, resetFloorCache } from "@/components/FloorFilter";
import { BedIndicator, BedCard } from "@/components/RoomVisual";
import { StatusBadge } from "@/components/StatusBadge";
import { compareRoomNumbers, floorLabel, genderLabel, occupancyLabel } from "@/lib/format";

type Bed = { id: string; number: number; status: string; occupancy?: { customer: { fullName: string } } | null };
type Room = {
  id: string;
  number: string;
  capacity: number;
  status: string;
  occupied: number;
  beds: Bed[];
  floor: number;
  gender: string;
  level?: { id: string; number: number; name: string } | null;
};

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [number, setNumber] = useState("");
  const [floor, setFloor] = useState("1");
  const [gender, setGender] = useState("MALE");
  const [capacity, setCapacity] = useState("4");
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Room | null>(null);
  const [drop, setDrop] = useState<Room | null>(null);
  const [floorFilter, setFloorFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  async function load() {
    setRooms(await api("/api/v1/admin/rooms"));
  }
  useEffect(() => {
    load();
  }, []);

  async function addRoom(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/v1/admin/rooms", {
        method: "POST",
        body: JSON.stringify({ number, floorNumber: Number(floor), gender, capacity: Number(capacity) }),
      });
      setNumber("");
      // Yangi qavat yaratilgan bo‘lishi mumkin — filtr ro‘yxati yangilanadi.
      resetFloorCache();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    }
  }

  async function addBed(room: Room) {
    const next = Math.max(0, ...room.beds.filter((b) => b.status === "ACTIVE").map((b) => b.number), 0) + 1;
    await api("/api/v1/admin/beds", { method: "POST", body: JSON.stringify({ roomId: room.id, number: next }) });
    const nextRooms = await api<Room[]>("/api/v1/admin/rooms");
    setRooms(nextRooms);
    setOpen(nextRooms.find((r) => r.id === room.id) || null);
  }

  async function dropBed(bed: Bed) {
    setError("");
    try {
      await api(`/api/v1/admin/beds/${bed.id}`, { method: "DELETE" });
      const nextRooms = await api<Room[]>("/api/v1/admin/rooms");
      setRooms(nextRooms);
      if (open) setOpen(nextRooms.find((r) => r.id === open.id) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Band o‘rinni o‘chirib bo‘lmaydi.");
    }
  }

  async function dropRoom() {
    if (!drop) return;
    setError("");
    try {
      await api(`/api/v1/admin/rooms/${drop.id}`, { method: "DELETE" });
      setDrop(null);
      setOpen(null);
      resetFloorCache();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xonani o‘chirib bo‘lmadi.");
      setDrop(null);
    }
  }

  const shown = rooms.filter(
    (r) => (!floorFilter || String(r.floor) === floorFilter) && (!genderFilter || r.gender === genderFilter),
  );
  // Har bir qavatning bollar va qizlar bloki alohida guruh:
  // raqamlar bloklar orasida takrorlanishi mumkin (1-qavatda bollarning ham, qizlarning ham 1-xonasi bo‘ladi).
  const roomGroups = Array.from(
    shown.reduce((acc, room) => {
      const key = `${room.floor || 0}|${room.gender}`;
      acc.set(key, [...(acc.get(key) || []), room]);
      return acc;
    }, new Map<string, Room[]>()),
  )
    .map(([key, list]) => ({
      key,
      level: Number(key.split("|")[0]),
      gender: key.split("|")[1],
      list: [...list].sort((a, b) => compareRoomNumbers(a.number, b.number)),
    }))
    .sort((a, b) => a.level - b.level || (a.gender === b.gender ? 0 : a.gender === "MALE" ? -1 : 1));

  function kind(room: Room) {
    if (room.status !== "ACTIVE") return "inactive";
    if (room.occupied <= 0) return "empty";
    if (room.occupied >= room.capacity) return "full";
    return "partial";
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-navy">Xonalar nazorati</h2>
        <p className="mt-1 text-sm text-muted">Xona qo‘shish, o‘rin boshqarish va bo‘sh xonani o‘chirish.</p>
      </div>
      {error ? <p className="mb-3 rounded-md bg-[#f8ecec] px-4 py-3 text-sm text-[#9b3b3b]">{error}</p> : null}

      <form onSubmit={addRoom} className="surface flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">
          Xona raqami
          <input required value={number} onChange={(e) => setNumber(e.target.value)} className="mt-1 block" placeholder="Masalan: 12" />
        </label>
        <label className="text-sm">
          Qavat
          <input
            required
            type="number"
            min={1}
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="mt-1 block w-28"
            placeholder="Masalan: 2"
          />
        </label>
        <label className="text-sm">
          Kimlar uchun
          <select required value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 block w-36">
            <option value="MALE">Bollar</option>
            <option value="FEMALE">Qizlar</option>
          </select>
        </label>
        <label className="text-sm">
          O‘rinlar soni
          <input required type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="mt-1 block w-28" />
        </label>
        <button className="btn-primary">Xona qo‘shish</button>
      </form>

      {rooms.length ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <FloorFilter scope="admin" value={floorFilter} onChange={setFloorFilter} />
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
            <option value="">Bollar va qizlar</option>
            <option value="MALE">Bollar xonalari</option>
            <option value="FEMALE">Qizlar xonalari</option>
          </select>
          <span className="text-sm text-muted">
            {shown.length} xona · {shown.reduce((a, r) => a + r.capacity, 0)} o‘rin
          </span>
        </div>
      ) : null}

      {rooms.length && !shown.length ? (
        <p className="mt-8 text-sm text-muted">Tanlangan filtrga mos xona yo‘q.</p>
      ) : null}

      {shown.length ? (
        <div className="mt-6 space-y-6">
          {roomGroups.map((group) => (
            <section key={group.key}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                {group.level ? `${group.level}-qavat` : "Qavat belgilanmagan"} · {genderLabel(group.gender)} ·{" "}
                {group.list.length} xona
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.list.map((room) => (
                  <article key={room.id} className="room-card">
                    <button type="button" onClick={() => setOpen(room)} className="w-full text-left">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xl font-semibold text-navy">{room.number}</p>
                          <p className="mt-0.5 text-xs text-muted">{genderLabel(room.gender)}</p>
                        </div>
                        <StatusBadge value={kind(room)} label={occupancyLabel(kind(room))} />
                      </div>
                      <div className="mt-4">
                        <BedIndicator beds={room.beds.filter((b) => b.status === "ACTIVE")} />
                        <p className="mt-3 text-sm text-muted">
                          {room.occupied} BAND / {Math.max(0, room.capacity - room.occupied)} BO‘SH
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="mt-4 text-sm font-medium text-danger"
                      onClick={() => setDrop(room)}
                    >
                      Xonani o‘chirish
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {!rooms.length ? (
        <p className="mt-8 text-sm text-muted">Hozircha xona yo‘q. Yuqoridan yangi xona qo‘shing.</p>
      ) : null}

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(null)}>
          <div className="surface max-h-[90vh] w-full max-w-lg overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-navy">{open.number}-xona</h2>
            <p className="mt-1 text-sm text-muted">
              {open.level?.name || floorLabel(open.floor)} · {genderLabel(open.gender)} · {open.capacity} o‘rin
            </p>
            <div className="mt-4 space-y-2">
              {open.beds.filter((b) => b.status === "ACTIVE").map((bed) => (
                <div key={bed.id} className="flex items-center gap-2">
                  <BedCard number={bed.number} occupied={!!bed.occupancy} guest={bed.occupancy?.customer.fullName} />
                  {!bed.occupancy ? (
                    <button className="text-sm text-danger" onClick={() => dropBed(bed)}>
                      O‘chirish
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => addBed(open)}>
                O‘rin qo‘shish
              </button>
              <button className="btn-danger" onClick={() => setDrop(open)}>
                Xonani o‘chirish
              </button>
              <button className="btn-secondary" onClick={() => setOpen(null)}>
                Yopish
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {drop ? (
        <ConfirmModal
          danger
          title="Xonani o‘chirish"
          text={`${drop.number}-xonani o‘chirishni tasdiqlaysizmi?${drop.occupied ? "\nXonada mijoz bo‘lsa o‘chirilmaydi." : ""}`}
          confirmLabel="O‘chirish"
          onClose={() => setDrop(null)}
          onConfirm={dropRoom}
        />
      ) : null}
    </div>
  );
}
