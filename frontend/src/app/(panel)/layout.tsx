import { getSession } from "@/lib/auth";
import { PanelShell } from "@/components/PanelShell";
import { redirect } from "next/navigation";
import { homePath, ROLES } from "@/lib/roles";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== ROLES.RECEPTION) redirect(homePath(session.role));
  return <PanelShell user={session}>{children}</PanelShell>;
}
