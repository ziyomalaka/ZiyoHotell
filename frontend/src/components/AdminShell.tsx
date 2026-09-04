import { SessionProvider } from "@/lib/session";
import type { SessionUser } from "@/lib/session-types";
import { AppShell } from "./AppShell";

const nav = [
  { href: "/admin/rooms", label: "Xonalar nazorati", icon: "bed" },
  { href: "/admin/staff", label: "Xodimlar", icon: "team" },
  { href: "/admin/customers", label: "Mijozlar", icon: "users" },
  { href: "/admin/settings", label: "Tizim nazorati", icon: "cog" },
];

export function AdminShell({ children, user }: { children: React.ReactNode; user: SessionUser }) {
  return (
    <SessionProvider user={user}>
      <AppShell userName={user.fullName} roleLabel="DASTURIY ADMIN" nav={nav} homeHref="/admin/rooms">
        {children}
      </AppShell>
    </SessionProvider>
  );
}
