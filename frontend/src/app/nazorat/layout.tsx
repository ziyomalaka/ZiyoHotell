import { getSession } from "@/lib/auth";
import { SupervisorShell } from "@/components/SupervisorShell";
import { redirect } from "next/navigation";
import { homePath, ROLES } from "@/lib/roles";

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== ROLES.SUPERVISOR) redirect(homePath(session.role));
  return <SupervisorShell user={session}>{children}</SupervisorShell>;
}
