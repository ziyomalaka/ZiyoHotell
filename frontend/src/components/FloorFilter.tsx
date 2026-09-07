"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type FloorOption = { id?: string; number: number; name: string; rooms: number };

type Scope = "reception" | "admin" | "manager";

type RawFloor = {
  id?: string;
  number: number;
  name?: string;
  rooms?: number;
  _count?: { rooms?: number };
};

// Qavatlar ro‘yxati kam o‘zgaradi — har bir sahifada qayta so‘rov yubormaslik uchun kesh.
const cache = new Map<Scope, Promise<FloorOption[]>>();

function normalize(rows: RawFloor[]): FloorOption[] {
  return rows
    .map((f) => ({
      id: f.id,
      number: Number(f.number),
      name: f.name || `${f.number}-qavat`,
      rooms: f.rooms ?? f._count?.rooms ?? 0,
    }))
    .filter((f) => Number.isFinite(f.number))
    .sort((a, b) => a.number - b.number);
}

function load(scope: Scope) {
  const cached = cache.get(scope);
  if (cached) return cached;
  const request = api<RawFloor[]>(`/api/v1/${scope}/floors`)
    .then(normalize)
    .catch(() => [] as FloorOption[]);
  cache.set(scope, request);
  return request;
}

/** Qavatlar ro‘yxatini bir marta yuklab, keshdan qaytaradi. */
export function useFloors(scope: Scope) {
  const [floors, setFloors] = useState<FloorOption[]>([]);
  useEffect(() => {
    let alive = true;
    load(scope).then((rows) => {
      if (alive) setFloors(rows);
    });
    return () => {
      alive = false;
    };
  }, [scope]);
  return floors;
}

/** Yangi xona qo‘shilganda keshni tozalaydi. */
export function resetFloorCache() {
  cache.clear();
}

/** Ro‘yxat va hisobotlarda ishlatiladigan qavat filtri. Bo‘sh qiymat — barcha qavatlar. */
export function FloorFilter({
  scope,
  value,
  onChange,
  className = "",
  allLabel = "Barcha qavatlar",
}: {
  scope: Scope;
  value: string;
  onChange: (floor: string) => void;
  className?: string;
  allLabel?: string;
}) {
  const floors = useFloors(scope);
  if (!floors.length) return null;
  return (
    <select
      aria-label="Qavat"
      title="Qavat bo‘yicha filtr"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">{allLabel}</option>
      {floors.map((f) => (
        <option key={f.number} value={String(f.number)}>
          {f.number}-qavat
        </option>
      ))}
    </select>
  );
}
