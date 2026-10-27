import { SessionProvider } from "@/lib/session";
import type { SessionUser } from "@/lib/session-types";
import { AppShell } from "./AppShell";

const nav = [
  { href: "/register", label: "Ro‘yxatga olish", short: "Ro‘yxat", icon: "user" },
  { href: "/customers", label: "Mijozlar boshqaruvi", short: "Mijozlar", icon: "users" },
  { href: "/rooms", label: "Xonalar va o‘rinlar", short: "Xonalar", icon: "bed" },
  { href: "/stays", label: "Kirish / Chiqish", short: "Kirish", icon: "door" },
  { href: "/reports", label: "Hisobotlar", short: "Hisobot", icon: "chart" },
];

export function PanelShell({ children, user }: { children: React.ReactNode; user: SessionUser }) {
  return (
    <SessionProvider user={user}>
      <AppShell userName={user.fullName} roleLabel="ADMIN / RECEPTION" nav={nav} homeHref="/register">
        {children}
      </AppShell>
    </SessionProvider>
  );
}
