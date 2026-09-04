"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { parsePermissions } from "@/lib/roles";

type Role = { id: string; code: string; name: string; permissions: string };
type Perm = { key: string; label: string };

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [code, setCode] = useState("RECEPTION");

  useEffect(() => {
    api<Role[]>("/api/v1/admin/roles").then(setRoles);
    api<Perm[]>("/api/v1/admin/permissions").then(setPerms);
  }, []);

  const current = roles.find((r) => r.code === code);
  const selected = parsePermissions(current?.permissions);

  function toggle(key: string) {
    if (!current) return;
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    setRoles(roles.map((r) => (r.id === current.id ? { ...r, permissions: JSON.stringify(next) } : r)));
  }

  async function save() {
    if (!current) return;
    await api(`/api/v1/admin/roles/${current.code}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissions: parsePermissions(current.permissions) }),
    });
    alert("Saqlandi");
  }

  return (
    <div>
      <h1 className="sr-only">Rollar va huquqlar</h1>
      <div className="mt-4 flex gap-2">
        {roles.map((r) => (
          <button key={r.code} onClick={() => setCode(r.code)} className={`chip ${code===r.code ? "chip-active" : ""}`}>
            {r.name}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-2 card p-5 sm:grid-cols-2">
        {perms.map((p) => (
          <label key={p.key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(p.key)} onChange={() => toggle(p.key)} />
            {p.label}
          </label>
        ))}
      </div>
      <button onClick={save} className="btn-primary mt-4">Saqlash</button>
    </div>
  );
}
