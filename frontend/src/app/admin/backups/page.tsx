"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type Backup = {
  id: string;
  createdAt: string;
  size: number;
  status: string;
  type: string;
  createdBy: { fullName: string };
};

export default function BackupsPage() {
  const [rows, setRows] = useState<Backup[]>([]);
  const [restore, setRestore] = useState<Backup | null>(null);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setRows(await api("/api/v1/admin/backups"));
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    setMsg("");
    try {
      await api("/api/v1/admin/backups", { method: "POST" });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Backup xatosi");
    }
  }

  async function doRestore() {
    if (!restore) return;
    const data = await api<{ warning: string; steps: string[] }>(`/api/v1/admin/backups/${restore.id}/restore`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    setRestore(null);
    setPassword("");
    setMsg(`${data.warning} ${data.steps.join(" ")}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="sr-only">Backup / Restore</h1>
        <button onClick={create} className="btn-primary">
          Qo‘lda backup
        </button>
      </div>
      {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
      <div className="mt-5 card overflow-x-auto">
        <table className="data-table">
          <thead className="bg-background text-left">
            <tr>
              {["Sana", "Hajm", "Holat", "Tur", "Kim", ""].map((h) => (
                <th key={h} className="px-3 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-3">{formatDateTime(r.createdAt)}</td>
                <td className="px-3 py-3">{Math.round(r.size / 1024)} KB</td>
                <td className="px-3 py-3">{r.status}</td>
                <td className="px-3 py-3">{r.type}</td>
                <td className="px-3 py-3">{r.createdBy.fullName}</td>
                <td className="px-3 py-3">
                  <button className="text-red" onClick={() => setRestore(r)}>
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {restore ? (
        <div className="modal-backdrop">
          <div className="w-full max-w-md card p-6">
            <h3 className="text-xl font-semibold">Restore</h3>
            <p className="mt-3 text-sm text-muted">
              Productionda avtomatik pg_restore ishga tushirilmaydi. Parolni tasdiqlang — sizga xavfsiz CLI runbook qaytadi.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parolni qayta kiriting"
              className="mt-4 w-full rounded-lg border border-line px-3 py-2"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRestore(null)} className="btn-secondary">
                Bekor qilish
              </button>
              <button disabled={!password} onClick={doRestore} className="btn-danger">
                Runbook olish
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
