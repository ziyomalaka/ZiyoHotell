import { SessionProvider } from "@/lib/session";
import type { SessionUser } from "@/lib/session-types";
import { AppShell } from "./AppShell";

const nav = [
  { href: "/nazorat", label: "Sektorlar va xonalar", icon: "bed" },
  { href: "/nazorat/muddat", label: "To‘lov muddati", icon: "debt" },
  { href: "/nazorat/tolovlar", label: "To‘lovlar", icon: "pay" },
];

export function SupervisorShell({ children, user }: { children: React.ReactNode; user: SessionUser }) {
  return (
    <SessionProvider user={user}>
      <AppShell userName={user.fullName} roleLabel="NAZORATCHI" nav={nav} homeHref="/nazorat">
        {children}
      </AppShell>
    </SessionProvider>
  );
}
