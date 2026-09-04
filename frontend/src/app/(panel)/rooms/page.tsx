"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { BedCard, RoomCard } from "@/components/RoomVisual";
import { formatDate, formatMoney } from "@/lib/format";

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
  const [open, setOpen] = useState<Room | null>(null);
  const [guest, setGuest] = useState<Bed | null>(null);

  useEffect(() => {
    api<Room[]>("/api/v1/reception/rooms").then(setRooms);
  }, []);

  const shown = useMemo(() => {
    return rooms.filter((r) => {
      const text = `${r.number} ${r.beds.map((b) => b.occupancy?.customer.fullName || "").join(" ")}`.toLowerCase();
      if (q && !text.includes(q.toLowerCase())) return false;
      if (filter === "empty" && r.kind !== "empty") return false;
      if (filter === "partial" && r.kind !== "partial") return false;
      if (filter === "full" && r.kind !== "full") return false;
      return true;
    });
  }, [rooms, q, filter]);

  return (
    <div>
      <FilterBar>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Xona yoki mijoz" className="min-w-[180px] flex-1" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Barchasi</option>
          <option value="empty">Bo‘sh</option>
          <option value="partial">Qisman band</option>
          <option value="full">To‘liq band</option>
        </select>
      </FilterBar>
      {shown.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map((room) => (
            <RoomCard
              key={room.id}
              number={room.number}
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
              {open.capacity} ta o‘rin · {open.occupied} band · {open.free} bo‘sh
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
