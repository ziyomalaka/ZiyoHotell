import { getSession } from "@/lib/auth";
import { ManagerShell } from "@/components/ManagerShell";
import { redirect } from "next/navigation";
import { homePath, ROLES } from "@/lib/roles";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== ROLES.BOSHLIQ) redirect(homePath(session.role));
  return <ManagerShell user={session}>{children}</ManagerShell>;
}
