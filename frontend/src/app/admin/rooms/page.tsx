"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ConfirmModal } from "@/components/ConfirmModal";
import { SectorFilter, resetSectorCache } from "@/components/SectorFilter";
import { BedIndicator, BedCard } from "@/components/RoomVisual";
import { StatusBadge } from "@/components/StatusBadge";
import { compareRoomNumbers, floorLabel, genderLabel, occupancyLabel, sectorLabel } from "@/lib/format";

type Bed = { id: string; number: number; status: string; occupancy?: { customer: { fullName: string } } | null };
type Sector = { id: string; number: number; name: string; gender?: string | null; floor?: number | null; rooms: number };
type Room = {
  id: string;
  number: string;
  capacity: number;
  status: string;
  occupied: number;
  beds: Bed[];
  floor: number;
  gender: string;
  sectorId?: string | null;
  sector?: Sector | null;
};

const emptySector = { id: "", number: "", name: "", gender: "MALE", floor: "1" };

/** Sektor kimlar uchun: jinsi belgilanmagan sektorda (masalan, fitnes) jins har bir xonada tanlanadi. */
function sectorGenderLabel(gender?: string | null) {
  return gender ? genderLabel(gender) : "Bollar va qizlar";
}

export default function AdminRoomsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sectorId, setSectorId] = useState("");
  const [number, setNumber] = useState("");
  const [gender, setGender] = useState("MALE");
  const [roomFloor, setRoomFloor] = useState("1");
  const [capacity, setCapacity] = useState("4");
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Room | null>(null);
  const [drop, setDrop] = useState<Room | null>(null);
  const [sectorForm, setSectorForm] = useState<typeof emptySector | null>(null);
  const [dropSector, setDropSector] = useState<Sector | null>(null);
  const [sectorFilter, setSectorFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  async function load() {
    const [nextSectors, nextRooms] = await Promise.all([
      api<Sector[]>("/api/v1/admin/sectors"),
      api<Room[]>("/api/v1/admin/rooms"),
    ]);
    setSectors(nextSectors);
    setRooms(nextRooms);
    return nextRooms;
  }
  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Xatolik"));
  }, []);

  // Xona qo‘shish formasida sektor tanlanmagan bo‘lsa, birinchi sektor taklif qilinadi.
  const formSector = sectors.find((s) => s.id === sectorId) || sectors[0];

  async function addRoom(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!formSector) {
      setError("Avval sektor qo‘shing.");
      return;
    }
    try {
      await api("/api/v1/admin/rooms", {
        method: "POST",
        body: JSON.stringify({
          sectorId: formSector.id,
          number,
          capacity: Number(capacity),
          ...(formSector.gender ? {} : { gender }),
          ...(formSector.floor == null ? { floorNumber: Number(roomFloor) } : {}),
        }),
      });
      setNumber("");
      resetSectorCache();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    }
  }

  async function saveSector(e: FormEvent) {
    e.preventDefault();
    if (!sectorForm) return;
    setError("");
    const body = {
      number: Number(sectorForm.number),
      name: sectorForm.name.trim(),
      gender: sectorForm.gender || null,
      floor: sectorForm.floor === "" ? null : Number(sectorForm.floor),
    };
    try {
      await api(sectorForm.id ? `/api/v1/admin/sectors/${sectorForm.id}` : "/api/v1/admin/sectors", {
        method: sectorForm.id ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      setSectorForm(null);
      resetSectorCache();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sektor saqlanmadi.");
    }
  }

  async function removeSector() {
    if (!dropSector) return;
    setError("");
    try {
      await api(`/api/v1/admin/sectors/${dropSector.id}`, { method: "DELETE" });
      setDropSector(null);
      resetSectorCache();
      await load();
    } catch (err) {
      setDropSector(null);
      setError(err instanceof Error ? err.message : "Sektorni o‘chirib bo‘lmadi.");
    }
  }

  async function moveRoom(room: Room, nextSectorId: string) {
    setError("");
    try {
      await api(`/api/v1/admin/rooms/${room.id}`, {
        method: "PUT",
        body: JSON.stringify({ number: room.number, capacity: room.capacity, sectorId: nextSectorId }),
      });
      resetSectorCache();
      const nextRooms = await load();
      setOpen(nextRooms.find((r) => r.id === room.id) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xonani ko‘chirib bo‘lmadi.");
    }
  }

  async function addBed(room: Room) {
    const next = Math.max(0, ...room.beds.filter((b) => b.status === "ACTIVE").map((b) => b.number), 0) + 1;
    await api("/api/v1/admin/beds", { method: "POST", body: JSON.stringify({ roomId: room.id, number: next }) });
    const nextRooms = await load();
    setOpen(nextRooms.find((r) => r.id === room.id) || null);
  }

  async function dropBed(bed: Bed) {
    setError("");
    try {
      await api(`/api/v1/admin/beds/${bed.id}`, { method: "DELETE" });
      const nextRooms = await load();
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
      resetSectorCache();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xonani o‘chirib bo‘lmadi.");
      setDrop(null);
    }
  }

  const shown = rooms.filter(
    (r) => (!sectorFilter || String(r.sector?.number) === sectorFilter) && (!genderFilter || r.gender === genderFilter),
  );
  // Xonalar sektorlar bo‘yicha guruhlanadi; sektorsiz xonalar oxirida, ularni sektorga biriktirish kerak.
  const roomGroups = Array.from(
    shown.reduce((acc, room) => {
      const key = room.sector?.id || "";
      acc.set(key, [...(acc.get(key) || []), room]);
      return acc;
    }, new Map<string, Room[]>()),
  )
    .map(([key, list]) => ({
      key,
      sector: list[0].sector || null,
      list: [...list].sort((a, b) => compareRoomNumbers(a.number, b.number)),
    }))
    .sort((a, b) => (a.sector?.number ?? 999) - (b.sector?.number ?? 999));

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
        <p className="mt-1 text-sm text-muted">Sektorlar, ularning ichidagi xonalar va xonalardagi o‘rinlar.</p>
      </div>
      {error ? <p className="mb-3 rounded-md bg-[#f8ecec] px-4 py-3 text-sm text-[#9b3b3b]">{error}</p> : null}

      <section className="surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-navy">Sektorlar</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSectorForm({ ...emptySector, number: String((sectors.at(-1)?.number || 0) + 1) })}
          >
            Sektor qo‘shish
          </button>
        </div>
        {sectors.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sektor</th>
                  <th>Qavat</th>
                  <th>Kimlar uchun</th>
                  <th>Xonalar</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sectors.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium text-navy">{sectorLabel(s)}</td>
                    <td>{s.floor == null ? "—" : floorLabel(s.floor)}</td>
                    <td>{sectorGenderLabel(s.gender)}</td>
                    <td>{s.rooms}</td>
                    <td>
                      <div className="flex justify-end gap-3 text-sm">
                        <button
                          type="button"
                          className="font-medium text-royal"
                          onClick={() =>
                            setSectorForm({
                              id: s.id,
                              number: String(s.number),
                              name: s.name,
                              gender: s.gender || "",
                              floor: s.floor == null ? "" : String(s.floor),
                            })
                          }
                        >
                          Tahrirlash
                        </button>
                        {!s.rooms ? (
                          <button type="button" className="font-medium text-danger" onClick={() => setDropSector(s)}>
                            O‘chirish
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Hozircha sektor yo‘q. Avval sektor qo‘shing.</p>
        )}

        {sectorForm ? (
          <form onSubmit={saveSector} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <label className="text-sm">
              Sektor raqami
              <input
                required
                type="number"
                min={1}
                value={sectorForm.number}
                onChange={(e) => setSectorForm({ ...sectorForm, number: e.target.value })}
                className="mt-1 block w-24"
              />
            </label>
            <label className="text-sm">
              Nomi
              <input
                required
                value={sectorForm.name}
                onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })}
                className="mt-1 block"
                placeholder="Masalan: Bollar yotoqxonasi"
              />
            </label>
            <label className="text-sm">
              Qavat
              <select
                value={sectorForm.floor}
                onChange={(e) => setSectorForm({ ...sectorForm, floor: e.target.value })}
                className="mt-1 block w-36"
              >
                <option value="">Belgilanmagan</option>
                <option value="-1">Podval (−1)</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}-qavat
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Kimlar uchun
              <select
                value={sectorForm.gender}
                onChange={(e) => setSectorForm({ ...sectorForm, gender: e.target.value })}
                className="mt-1 block w-40"
              >
                <option value="MALE">Bollar</option>
                <option value="FEMALE">Qizlar</option>
                <option value="">Bollar va qizlar</option>
              </select>
            </label>
            <button className="btn-primary">{sectorForm.id ? "Saqlash" : "Sektor qo‘shish"}</button>
            <button type="button" className="btn-secondary" onClick={() => setSectorForm(null)}>
              Bekor qilish
            </button>
          </form>
        ) : null}
      </section>

      <form onSubmit={addRoom} className="surface mt-5 flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">
          Sektor
          <select required value={formSector?.id || ""} onChange={(e) => setSectorId(e.target.value)} className="mt-1 block w-64">
            {!sectors.length ? <option value="">Sektor yo‘q</option> : null}
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {sectorLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Xona raqami
          <input required value={number} onChange={(e) => setNumber(e.target.value)} className="mt-1 block w-32" placeholder="Masalan: 12" />
        </label>
        {formSector && !formSector.gender ? (
          <label className="text-sm">
            Kimlar uchun
            <select required value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 block w-36">
              <option value="MALE">Bollar</option>
              <option value="FEMALE">Qizlar</option>
            </select>
          </label>
        ) : null}
        {formSector && formSector.floor == null ? (
          <label className="text-sm">
            Qavat
            <select value={roomFloor} onChange={(e) => setRoomFloor(e.target.value)} className="mt-1 block w-32">
              <option value="-1">Podval (−1)</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>
                  {n}-qavat
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-sm">
          O‘rinlar soni
          <input required type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="mt-1 block w-28" />
        </label>
        <button className="btn-primary" disabled={!sectors.length}>
          Xona qo‘shish
        </button>
        {formSector ? (
          <p className="w-full text-xs text-muted">
            {sectorLabel(formSector)}
            {formSector.floor != null ? ` · ${floorLabel(formSector.floor)}` : ""} · {sectorGenderLabel(formSector.gender)}
          </p>
        ) : null}
      </form>

      {rooms.length ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <SectorFilter scope="admin" value={sectorFilter} onChange={setSectorFilter} />
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

      {rooms.length && !shown.length ? <p className="mt-8 text-sm text-muted">Tanlangan filtrga mos xona yo‘q.</p> : null}

      {shown.length ? (
        <div className="mt-6 space-y-6">
          {roomGroups.map((group) => (
            <section key={group.key}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                {sectorLabel(group.sector)}
                {group.sector?.floor != null ? ` · ${floorLabel(group.sector.floor)}` : ""}
                {group.sector ? ` · ${sectorGenderLabel(group.sector.gender)}` : " · xonani sektorga biriktiring"} ·{" "}
                {group.list.length} xona
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.list.map((room) => (
                  <article key={room.id} className="room-card">
                    <button type="button" onClick={() => setOpen(room)} className="w-full text-left">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xl font-semibold text-navy">{room.number}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {genderLabel(room.gender)} · {floorLabel(room.floor)}
                          </p>
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
                    <button type="button" className="mt-4 text-sm font-medium text-danger" onClick={() => setDrop(room)}>
                      Xonani o‘chirish
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {!rooms.length ? <p className="mt-8 text-sm text-muted">Hozircha xona yo‘q. Yuqoridan yangi xona qo‘shing.</p> : null}

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(null)}>
          <div className="surface max-h-[90vh] w-full max-w-lg overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-navy">{open.number}-xona</h2>
            <p className="mt-1 text-sm text-muted">
              {sectorLabel(open.sector)} · {floorLabel(open.floor)} · {genderLabel(open.gender)} · {open.capacity} o‘rin
            </p>
            <label className="mt-4 block text-sm">
              Sektor
              <select
                value={open.sector?.id || ""}
                onChange={(e) => e.target.value && moveRoom(open, e.target.value)}
                className="mt-1 block w-full"
              >
                {!open.sector ? <option value="">Sektorni tanlang</option> : null}
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {sectorLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 space-y-2">
              {open.beds
                .filter((b) => b.status === "ACTIVE")
                .map((bed) => (
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

      {dropSector ? (
        <ConfirmModal
          danger
          title="Sektorni o‘chirish"
          text={`${sectorLabel(dropSector)} ni o‘chirishni tasdiqlaysizmi?`}
          confirmLabel="O‘chirish"
          onClose={() => setDropSector(null)}
          onConfirm={removeSector}
        />
      ) : null}
    </div>
  );
}
