"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { FloorFilter } from "@/components/FloorFilter";
import { PaginationBar } from "@/components/PaginationBar";
import { floorLabel } from "@/lib/format";

type Row = {
  id: string;
  fullName: string;
  living?: boolean;
  occupancy?: {
    stay: { room: { number: string; floor: number } };
  } | null;
};

export default function ReceptionCustomersPage() {
  const router = useRouter();
  const [tab, setTab] = useState("all");
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
          ["all", "Barchasi"],
          ["living", "Hozir yashaydi"],
          ["left", "Chiqib ketgan"],
        ].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`chip ${tab === id ? "chip-active" : ""}`}>
            {l}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="F.I.Sh. / telefon / ID / xona" className="min-w-[200px] flex-1" />
        <FloorFilter scope="reception" value={floor} onChange={setFloor} />
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
              return (
                // Butun qator bosiladi: mijozning alohida profil sahifasi ochiladi.
                <tr key={r.id} onClick={() => router.push(`/customers/${r.id}`)} className="cursor-pointer hover:bg-white">
                  <td>
                    <Link href={`/customers/${r.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-navy hover:underline">
                      {r.fullName}
                    </Link>
                    {!r.living ? <span className="ml-2 text-xs text-muted">chiqib ketgan</span> : null}
                  </td>
                  <td>
                    {room ? (
                      <>
                        <span className="font-medium text-navy">{room.number}-xona</span>
                        <span className="ml-2 text-xs text-muted">{floorLabel(room.floor)}</span>
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
