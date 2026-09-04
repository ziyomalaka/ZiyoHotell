"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type Log = {
  id: string;
  action: string;
  entity: string;
  section?: string | null;
  ip?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
  user: { fullName: string; login: string };
};

export default function AuditPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; rows: Log[] }>({ total: 0, rows: [] });
  useEffect(() => {
    api<{ total: number; rows: Log[] }>(`/api/v1/admin/audit-logs?q=${encodeURIComponent(q)}&page=${page}&pageSize=20`).then(setData);
  }, [q, page]);
  return (
    <div>
      <h1 className="sr-only">Audit log</h1>
      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Kim / amal" className="mt-4 rounded-lg border border-line bg-white px-3 py-2" />
      <div className="mt-4 space-y-3">
        {data.rows.map((r) => (
          <article key={r.id} className="card p-4 text-sm">
            <p className="font-medium">{formatDateTime(r.createdAt)} · {r.user.fullName}</p>
            <p className="text-muted">{r.action} · {r.entity} · {r.section || ""} · IP {r.ip || "—"}</p>
            {r.oldValue ? <p className="mt-1">Eski: {r.oldValue}</p> : null}
            {r.newValue ? <p>Yangi: {r.newValue}</p> : null}
          </article>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button disabled={page<=1} onClick={() => setPage(page-1)} className="rounded-lg bg-white px-3 py-2">Oldingi</button>
        <button disabled={page*20>=data.total} onClick={() => setPage(page+1)} className="rounded-lg bg-white px-3 py-2">Keyingi</button>
      </div>
    </div>
  );
}
