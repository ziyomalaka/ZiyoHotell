/** Sektor nomi ro‘yxat va hisobotlar uchun: "1-sektor · Bollar yotoqxonasi". */
export function sectorLabel(sector?: { number: number; name: string } | null) {
  return sector ? `${sector.number}-sektor · ${sector.name}` : 'Sektorsiz';
}

type BreakdownRoom = {
  status: string;
  capacity: number;
  sector?: { number: number; name: string } | null;
  beds: { status: string; occupancy: unknown }[];
};

/** Sektorlar kesimida bandlik: har bir sektordagi xonalar, o‘rinlar va band o‘rinlar. */
export function sectorBreakdown(rooms: BreakdownRoom[]) {
  const map = new Map<number, { sector: number; name: string; rooms: number; beds: number; occupied: number; repair: number }>();
  for (const room of rooms) {
    const key = room.sector?.number ?? 0;
    const entry = map.get(key) || { sector: key, name: sectorLabel(room.sector), rooms: 0, beds: 0, occupied: 0, repair: 0 };
    const inactive = room.status !== 'ACTIVE';
    entry.rooms += 1;
    if (inactive) entry.repair += 1;
    for (const bed of room.beds) {
      if (bed.status === 'ACTIVE' && !inactive) entry.beds += 1;
      if (bed.occupancy) entry.occupied += 1;
    }
    map.set(key, entry);
  }
  return Array.from(map.values())
    .sort((a, b) => (a.sector || 999) - (b.sector || 999))
    .map((s) => ({ ...s, free: Math.max(0, s.beds - s.occupied), percent: s.beds ? Math.round((s.occupied / s.beds) * 100) : 0 }));
}
