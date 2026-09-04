"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type Backup = { id: string; createdAt: string; status: string; fileName?: string };

export default function SettingsPage() {
  const [s, setS] = useState<Record<string, string>>({});
  const [backups, setBackups] = useState<Backup[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    setS(await api("/api/v1/admin/settings"));
    setBackups(await api("/api/v1/admin/backups"));
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setS(
      await api("/api/v1/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          hostelName: s.hostelName || "ZiyoHotel Yotoqxonasi",
          phone: s.phone || "",
        }),
      }),
    );
    setMsg("Saqlandi.");
  }

  async function backup() {
    setMsg("");
    try {
      await api("/api/v1/admin/backups", { method: "POST" });
      load();
      setMsg("Backup yaratildi.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Backup xatosi");
    }
  }

  const last = backups[0];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <form onSubmit={save} className="space-y-4">
        <label className="block text-sm">
          Tizim nomi
          <input value="ZiyoHotel" readOnly className="mt-1 w-full bg-background" />
        </label>
        <label className="block text-sm">
          Yotoqxona nomi
          <input value={s.hostelName || ""} onChange={(e) => setS({ ...s, hostelName: e.target.value })} className="mt-1 w-full" />
        </label>
        <label className="block text-sm">
          Telefon
          <input value={s.phone || ""} onChange={(e) => setS({ ...s, phone: e.target.value })} className="mt-1 w-full" placeholder="+998 ..." />
        </label>
        <button className="btn-primary">Saqlash</button>
      </form>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Backup</h2>
        <p className="mt-2 text-sm text-muted">
          Oxirgi backup: {last ? `${formatDateTime(last.createdAt)} · ${last.status}` : "hali yo‘q"}
        </p>
        <button type="button" onClick={backup} className="btn-secondary mt-3">
          Backup yaratish
        </button>
      </section>
      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
    </div>
  );
}
