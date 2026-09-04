"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const data = await api<{ home?: string }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          login: form.get("login"),
          password: form.get("password"),
        }),
      });
      router.push(data.home || "/register");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[linear-gradient(165deg,#041426_0%,#071b33_48%,#0754a6_100%)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 18%, rgba(242,193,78,0.22), transparent 26%), radial-gradient(circle at 82% 78%, rgba(10,99,199,0.4), transparent 34%), repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 18px)",
          }}
        />
        <BrandLogo size={128} light className="relative" />
        <div className="relative max-w-md">
          <p className="text-sm uppercase tracking-[0.28em] text-gold-premium">Premium yotoqxona tizimi</p>
          <h1 className="mt-4 text-5xl font-semibold text-white">ZiyoHotel</h1>
          <p className="mt-4 text-lg text-white/75">Qulaylik · Tartib · Ishonch</p>
          <p className="mt-6 text-sm leading-6 text-white/60">
            Mijozlar, xonalar, to‘lovlar va hisobotlar — bitta professional boshqaruv markazida.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-5">
        <form onSubmit={onSubmit} className="card w-full max-w-md p-8">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <BrandLogo size={56} />
            <div>
              <p className="font-semibold text-navy">ZiyoHotel</p>
              <p className="text-xs text-muted">Yotoqxona tizimi</p>
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Tizimga kirish</p>
          <h2 className="mt-2 text-3xl font-semibold text-navy">Xush kelibsiz</h2>
          <p className="mt-2 text-sm text-muted">Login va parol orqali davom eting.</p>
          <label className="mt-6 block text-sm font-medium">
            Login / telefon <span className="text-danger">*</span>
            <input name="login" required autoComplete="username" className="mt-2 w-full" />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Parol <span className="text-danger">*</span>
            <div className="relative mt-2">
              <input name="password" type={show ? "text" : "password"} required autoComplete="current-password" className="w-full pr-16" />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-royal">
                {show ? "Yashirish" : "Ko‘rsatish"}
              </button>
            </div>
          </label>
          {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
          <button disabled={loading} className="btn-primary mt-6 w-full">
            {loading ? "Tekshirilmoqda..." : "Kirish"}
          </button>
        </form>
      </div>
    </div>
  );
}
