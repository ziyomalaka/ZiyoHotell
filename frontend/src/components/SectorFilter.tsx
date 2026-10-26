"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { sectorLabel } from "@/lib/format";

export type SectorOption = {
  id: string;
  number: number;
  name: string;
  gender?: string | null;
  floor?: number | null;
  rooms: number;
};

type Scope = "reception" | "admin" | "manager";

// Sektorlar ro‘yxati kam o‘zgaradi — har bir sahifada qayta so‘rov yubormaslik uchun kesh.
const cache = new Map<Scope, Promise<SectorOption[]>>();

function load(scope: Scope) {
  const cached = cache.get(scope);
  if (cached) return cached;
  const request = api<SectorOption[]>(`/api/v1/${scope}/sectors`)
    .then((rows) => [...rows].sort((a, b) => a.number - b.number))
    .catch(() => [] as SectorOption[]);
  cache.set(scope, request);
  return request;
}

/** Sektorlar ro‘yxatini bir marta yuklab, keshdan qaytaradi. */
export function useSectors(scope: Scope) {
  const [sectors, setSectors] = useState<SectorOption[]>([]);
  useEffect(() => {
    let alive = true;
    load(scope).then((rows) => {
      if (alive) setSectors(rows);
    });
    return () => {
      alive = false;
    };
  }, [scope]);
  return sectors;
}

/** Sektor qo‘shilganda yoki o‘zgarganda keshni tozalaydi. */
export function resetSectorCache() {
  cache.clear();
}

/**
 * Ro‘yxat va hisobotlarda ishlatiladigan sektor filtri. Bo‘sh qiymat — barcha sektorlar.
 * Tanlangan sektor raqami API’ga `floor` parametri bilan yuboriladi.
 */
export function SectorFilter({
  scope,
  value,
  onChange,
  className = "",
  allLabel = "Barcha sektorlar",
}: {
  scope: Scope;
  value: string;
  onChange: (sector: string) => void;
  className?: string;
  allLabel?: string;
}) {
  const sectors = useSectors(scope);
  if (!sectors.length) return null;
  return (
    <select
      aria-label="Sektor"
      title="Sektor bo‘yicha filtr"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">{allLabel}</option>
      {sectors.map((s) => (
        <option key={s.id} value={String(s.number)}>
          {sectorLabel(s)}
        </option>
      ))}
    </select>
  );
}
