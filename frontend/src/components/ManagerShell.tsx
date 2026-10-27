import { SessionProvider } from "@/lib/session";
import type { SessionUser } from "@/lib/session-types";
import { AppShell } from "./AppShell";

const nav = [
  { href: "/manager", label: "Boshqaruv paneli", short: "Panel", icon: "home" },
  { href: "/manager/customers", label: "Mijozlar", icon: "users" },
  { href: "/manager/payments/daily", label: "Kunlik to‘lovlar", short: "Kunlik", icon: "pay" },
  { href: "/manager/payments/monthly", label: "Oylik to‘lovlar", short: "Oylik", icon: "chart" },
  { href: "/manager/reports", label: "Hisobotlar", short: "Hisobot", icon: "chart" },
];

export function ManagerShell({ children, user }: { children: React.ReactNode; user: SessionUser }) {
  return (
    <SessionProvider user={user}>
      <AppShell userName={user.fullName} roleLabel="BOSHLIQ" nav={nav} homeHref="/manager" variant="manager">
        {children}
      </AppShell>
    </SessionProvider>
  );
}
