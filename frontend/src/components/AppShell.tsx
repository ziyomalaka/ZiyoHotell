"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { BrandLogo } from "./BrandLogo";
import { NavIcon, type NavItem } from "./NavIcon";
import { ReminderBell } from "./ReminderBell";

export function AppShell({
  children,
  userName,
  roleLabel,
  nav,
  homeHref,
  variant = "default",
}: {
  children: React.ReactNode;
  userName: string;
  roleLabel: string;
  nav: NavItem[];
  homeHref?: string;
  variant?: "default" | "manager";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [now, setNow] = useState("");
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isManager = variant === "manager";

  useEffect(() => {
    const tick = () => setNow(formatDateTime(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  function active(href: string) {
    if (href === "/admin" || href === "/manager") return pathname === href;
    if (href === "/manager/payments") return pathname === "/manager/payments";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const pageTitle = nav.find((i) => active(i.href))?.label || "ZiyoHotel";
  const asideClass = isManager ? "hidden lg:block" : "hidden md:block";
  const overlayClass = isManager ? "lg:hidden" : "md:hidden";
  const burgerClass = isManager ? "lg:hidden" : "md:hidden";
  const collapseClass = isManager ? "hidden lg:block" : "hidden md:block";

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-white">
      <div className={`border-b border-white/10 px-4 py-5 ${collapsed ? "items-center" : ""}`}>
        <Link href={homeHref || nav[0]?.href || "/"} className={`flex ${collapsed ? "justify-center" : "items-center gap-3"}`}>
          <BrandLogo size={collapsed ? 40 : 52} light />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-wide">ZiyoHotel</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gold-premium/90">{roleLabel}</p>
            </div>
          ) : null}
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {nav.map((item) => {
          const on = active(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition duration-150 ${
                on
                  ? "border-l-2 border-gold-premium bg-white/12 text-white"
                  : "border-l-2 border-transparent text-white/70 hover:bg-white/8 hover:text-white"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <NavIcon name={item.icon} />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className={`mx-3 mb-3 rounded-xl border border-white/10 py-2 text-xs text-white/60 hover:bg-white/10 ${collapseClass}`}
      >
        {collapsed ? "»" : "« Menyu"}
      </button>
    </div>
  );

  return (
    <div className={`flex min-h-screen bg-background ${isManager ? "mgr-app" : ""}`}>
      <aside className={`sticky top-0 h-screen shrink-0 ${asideClass} ${collapsed ? "w-[84px]" : "w-[264px]"}`}>
        {sidebar}
      </aside>

      {drawer ? (
        <div className={`fixed inset-0 z-40 ${overlayClass}`}>
          <button type="button" className="absolute inset-0 bg-navy-deep/50 backdrop-blur-[2px]" onClick={() => setDrawer(false)} aria-label="Menyuni yopish" />
          <aside className="relative z-10 h-full w-[min(86vw,264px)] shadow-2xl">{sidebar}</aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-white/95 px-3 py-2.5 backdrop-blur md:px-6 md:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line text-navy ${burgerClass}`}
              onClick={() => setDrawer(true)}
              aria-label="Menyu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            {isManager ? (
              <Link href={homeHref || "/manager"} className="hidden shrink-0 max-lg:inline-flex" aria-label="ZiyoHotel">
                <BrandLogo size={36} />
              </Link>
            ) : null}
            <div className="min-w-0">
              <p className={`text-[11px] uppercase tracking-[0.18em] text-muted ${isManager ? "max-lg:hidden" : ""}`}>ZiyoHotel</p>
              <h1 className="truncate text-base font-semibold text-navy md:text-xl">{pageTitle}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm md:gap-3">
            <span className="hidden tabular text-muted lg:inline">{now}</span>
            <ReminderBell />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                className="flex h-11 items-center gap-2 rounded-full border border-line py-1 pl-1 pr-1 sm:pr-3"
                aria-label="Profil menyusi"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                  {userName.slice(0, 1).toUpperCase()}
                </span>
                <span className={`hidden text-left ${isManager ? "lg:block" : "sm:block"}`}>
                  <span className="block font-medium leading-tight">{userName}</span>
                  <span className="block text-[11px] text-muted">{roleLabel}</span>
                </span>
              </button>
              {menu ? (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-line bg-white p-2 shadow-lg">
                  <button type="button" onClick={logout} className="min-h-11 w-full rounded-lg px-3 py-2 text-left hover:bg-background">
                    Chiqish
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
