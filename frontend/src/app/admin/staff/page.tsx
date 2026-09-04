"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { ConfirmModal } from "@/components/ConfirmModal";
import { FormField } from "@/components/FormSection";
import { StatusBadge } from "@/components/StatusBadge";

type Staff = { id: string; fullName: string; login: string; phone?: string | null; role: string; workStatus: string; notes?: string | null };

const emptyForm = { fullName: "", login: "", phone: "", password: "", role: "RECEPTION", notes: "" };

function roleFormValue(role: string) {
  if (role === "SYSTEM_ADMIN" || role === "SOFTWARE_ADMIN") return "SOFTWARE_ADMIN";
  if (role === "MANAGER" || role === "BOSHLIQ") return "BOSHLIQ";
  return "RECEPTION";
}

function roleLabel(role: string) {
  if (role === "SYSTEM_ADMIN" || role === "SOFTWARE_ADMIN") return "Dasturiy Admin";
  if (role === "MANAGER" || role === "BOSHLIQ") return "Boshliq";
  return "Admin / Reception";
}

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function ActionBtn({
  label,
  tone = "neutral",
  onClick,
  children,
}: {
  label: string;
  tone?: "neutral" | "edit" | "warn" | "danger";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "text-muted hover:bg-white hover:text-navy",
    edit: "text-royal hover:bg-white hover:text-blue",
    warn: "text-warning hover:bg-white",
    danger: "text-danger hover:bg-white",
  };
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export default function StaffPage() {
  const me = useSession();
  const [data, setData] = useState<{ rows: Staff[] }>({ rows: [] });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [blockId, setBlockId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [temp, setTemp] = useState("");
  const [ok, setOk] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setData(await api(`/api/v1/admin/staff?q=${encodeURIComponent(q)}`));
  }
  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Xatolik"));
  }, [q]);

  function startEdit(u: Staff) {
    setError("");
    setOk("");
    setTemp("");
    setEditingId(u.id);
    setForm({
      fullName: u.fullName,
      login: u.login,
      phone: u.phone || "",
      password: "",
      role: roleFormValue(u.role),
      notes: u.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      const password = form.password.trim();
      if (!editingId && !password) {
        setError("Parol majburiy.");
        return;
      }
      const payload = {
        fullName: form.fullName.trim(),
        login: form.login.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        notes: form.notes || undefined,
        ...(password ? { password } : {}),
      };
      if (editingId) {
        await api(`/api/v1/admin/staff/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/api/v1/admin/staff", { method: "POST", body: JSON.stringify(payload) });
      }
      cancelEdit();
      await load();
      setOk(
        password
          ? "Saqlandi. Shu login va yangi parol bilan tizimga kirish mumkin."
          : "Xodim ma’lumotlari saqlandi.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    }
  }

  async function block() {
    if (!blockId) return;
    setError("");
    try {
      await api(`/api/v1/admin/staff/${blockId}/block`, { method: "POST" });
      setBlockId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    }
  }

  async function remove() {
    if (!deleteId) return;
    setError("");
    try {
      await api(`/api/v1/admin/staff/${deleteId}`, { method: "DELETE" });
      if (editingId === deleteId) cancelEdit();
      setDeleteId(null);
      await load();
    } catch (err) {
      setDeleteId(null);
      setError(err instanceof Error ? err.message : "Xatolik");
    }
  }

  async function reset(id: string) {
    setError("");
    try {
      const r = await api<{ tempPassword: string }>(`/api/v1/admin/staff/${id}/reset-password`, { method: "POST" });
      setTemp(r.tempPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    }
  }

  const deleting = data.rows.find((u) => u.id === deleteId);

  return (
    <div>
      <h1 className="sr-only">Xodimlar</h1>

      <form onSubmit={save} className="mt-5 card p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-white">
            <Glyph d={editingId ? "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" : "M12 5v14M5 12h14"} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Xodimlar</p>
            <h2 className="text-lg font-semibold text-navy">{editingId ? "Xodimni tahrirlash" : "Yangi xodim"}</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <FormField label="F.I.Sh." required>
            <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full" />
          </FormField>
          <FormField label="Login" required>
            <input required value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} className="w-full" />
          </FormField>
          <FormField label="Telefon">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full" />
          </FormField>
          <FormField label={editingId ? "Yangi parol" : "Parol"} required={!editingId}>
            <input
              required={!editingId}
              type="password"
              placeholder={editingId ? "O‘zgartirish shart emas" : ""}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full"
            />
          </FormField>
          <FormField label="Rol" required>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full">
              <option value="RECEPTION">Admin / Reception</option>
              <option value="SOFTWARE_ADMIN">Dasturiy Admin</option>
              <option value="BOSHLIQ">Boshliq</option>
            </select>
          </FormField>
          <div className="flex items-end gap-2">
            <button className="btn-primary flex-1">{editingId ? "Saqlash" : "Yangi xodim"}</button>
            {editingId ? (
              <button type="button" className="btn-secondary" onClick={cancelEdit}>
                Bekor
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {ok ? <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success">{ok}</p> : null}
      {temp ? (
        <p className="mt-3 rounded-xl bg-gold-light px-3 py-2 text-sm text-navy">
          Vaqtinchalik parol: <b className="tabular">{temp}</b>
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <label className="relative block max-w-sm flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Glyph d="M11 5a6 6 0 1 0 3.7 10.7L21 22" />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="F.I.Sh. / login / telefon"
            className="w-full pl-10"
          />
        </label>
      </div>

      <div className="mt-4 card overflow-x-auto">
        <table className="data-table">
          <thead className="bg-background text-left">
            <tr>
              <th className="px-3 py-3">F.I.Sh.</th>
              <th className="px-3 py-3">Login</th>
              <th className="px-3 py-3">Rol</th>
              <th className="px-3 py-3">Holat</th>
              <th className="px-3 py-3 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((u) => (
              <tr key={u.id} className={editingId === u.id ? "bg-royal/5" : ""}>
                <td className="px-3 py-3 font-medium text-navy">{u.fullName}</td>
                <td className="px-3 py-3 text-muted">{u.login}</td>
                <td className="px-3 py-3">{roleLabel(u.role)}</td>
                <td className="px-3 py-3">
                  <StatusBadge value={u.workStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE"} label={u.workStatus} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end">
                    <div className="inline-flex items-center gap-0.5 rounded-2xl border border-line bg-[#f6f8fb] p-1">
                      <ActionBtn label="Tahrirlash" tone="edit" onClick={() => startEdit(u)}>
                        <Glyph d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                      </ActionBtn>
                      <ActionBtn label="Parolni tiklash" tone="neutral" onClick={() => reset(u.id)}>
                        <Glyph d="M8 15a4 4 0 1 1 3.2-6.4L21 14.4V18h-3v-2h-2v-2l-3.3-3.3A4 4 0 0 1 8 15z" />
                      </ActionBtn>
                      {u.workStatus === "ACTIVE" ? (
                        <ActionBtn label="Bloklash" tone="warn" onClick={() => setBlockId(u.id)}>
                          <Glyph d="M8 11V8a4 4 0 0 1 8 0v3M7 11h10v10H7z" />
                        </ActionBtn>
                      ) : (
                        <ActionBtn
                          label="Blokdan chiqarish"
                          tone="edit"
                          onClick={async () => {
                            setError("");
                            try {
                              await api(`/api/v1/admin/staff/${u.id}/unblock`, { method: "POST" });
                              await load();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Xatolik");
                            }
                          }}
                        >
                          <Glyph d="M8 11V8a4 4 0 0 1 7.5-2M7 11h10v10H7z" />
                        </ActionBtn>
                      )}
                      {u.id !== me.id ? (
                        <ActionBtn label="O‘chirish" tone="danger" onClick={() => setDeleteId(u.id)}>
                          <Glyph d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                        </ActionBtn>
                      ) : (
                        <span className="inline-flex h-9 w-9" aria-hidden />
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {blockId ? (
        <ConfirmModal title="Xodimni bloklash" text="Ushbu xodimni bloklashni tasdiqlaysizmi?" onClose={() => setBlockId(null)} onConfirm={block} />
      ) : null}
      {deleteId ? (
        <ConfirmModal
          title="Xodimni o‘chirish"
          text={`${deleting?.fullName || "Xodim"} (${deleting?.login || ""}) ni o‘chirishni tasdiqlaysizmi? Bu amalni qaytarib bo‘lmaydi.`}
          confirmLabel="O‘chirish"
          danger
          onClose={() => setDeleteId(null)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
