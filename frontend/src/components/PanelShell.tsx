import { SessionProvider } from "@/lib/session";
import type { SessionUser } from "@/lib/session-types";
import { AppShell } from "./AppShell";

const nav = [
  { href: "/register", label: "Ro‘yxatga olish", icon: "user" },
  { href: "/customers", label: "Mijozlar boshqaruvi", icon: "users" },
  { href: "/rooms", label: "Xonalar va o‘rinlar", icon: "bed" },
  { href: "/stays", label: "Kirish / Chiqish", icon: "door" },
  { href: "/payments", label: "To‘lov tarixi", icon: "pay" },
  { href: "/reports", label: "Hisobotlar", icon: "chart" },
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
