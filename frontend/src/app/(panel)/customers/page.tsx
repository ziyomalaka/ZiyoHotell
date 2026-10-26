"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { SectorFilter } from "@/components/SectorFilter";
import { PaginationBar } from "@/components/PaginationBar";
import { daysLeftLabel, sectorLabel } from "@/lib/format";

type Row = {
  id: string;
  fullName: string;
  daysLeft?: number | null;
  occupancy?: {
    stay: { room: { number: string; floor: number; sector?: { number: number; name: string } | null } };
  } | null;
};

/** To‘lovgacha 1 kun qolsa yoki muddat o‘tgan bo‘lsa qizil, 3 kungacha qolsa sariq. */
function dueTone(daysLeft?: number | null) {
  if (daysLeft == null) return null;
  if (daysLeft <= 1) return { cell: "bg-[#f7cfcf]", text: "text-[#8a2f2f]" };
  if (daysLeft <= 3) return { cell: "bg-[#fdecb0]", text: "text-[#7a5a00]" };
  return null;
}

export default function ReceptionCustomersPage() {
  const router = useRouter();
  const [tab, setTab] = useState("living");
  const [q, setQ] = useState("");
  const [floor, setFloor] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; rows: Row[] }>({ total: 0, rows: [] });

  async function load(nextPage = page) {
    const p = new URLSearchParams({ tab, q, page: String(nextPage) });
    if (floor) p.set("floor", floor);
    setData(await api(`/api/v1/reception/customers?${p}`));
  }

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, floor]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["living", "Hozir yashaydi"],
          ["left", "Chiqib ketgan"],
        ].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`chip ${tab === id ? "chip-active" : ""}`}>
            {l}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="F.I.Sh. / telefon / ID / xona" className="min-w-[200px] flex-1" />
        <SectorFilter scope="reception" value={floor} onChange={setFloor} />
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>F.I.Sh.</th>
              <th>Xona</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const room = r.occupancy?.stay.room;
              const tone = dueTone(r.daysLeft);
              return (
                // Butun qator bosiladi: mijozning alohida profil sahifasi ochiladi.
                <tr key={r.id} onClick={() => router.push(`/customers/${r.id}`)} className="cursor-pointer hover:bg-white">
                  <td className={tone?.cell}>
                    <Link href={`/customers/${r.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-navy hover:underline">
                      {r.fullName}
                    </Link>
                    {tone ? <span className={`ml-2 text-xs font-semibold ${tone.text}`}>{daysLeftLabel(r.daysLeft)}</span> : null}
                  </td>
                  <td>
                    {room ? (
                      <>
                        <span className="font-medium text-navy">{room.number}-xona</span>
                        <span className="ml-2 text-xs text-muted">{sectorLabel(room.sector)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!data.rows.length ? <EmptyState className="mt-4" text="Hozircha mijozlar mavjud emas." /> : null}
      <PaginationBar page={page} pageSize={20} total={data.total} onPage={(p) => { setPage(p); load(p); }} />
    </div>
  );
}
