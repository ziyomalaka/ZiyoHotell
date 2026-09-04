import { getSession } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { redirect } from "next/navigation";
import { homePath, ROLES } from "@/lib/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== ROLES.SOFTWARE_ADMIN) redirect(homePath(session.role));
  return <AdminShell user={session}>{children}</AdminShell>;
}
