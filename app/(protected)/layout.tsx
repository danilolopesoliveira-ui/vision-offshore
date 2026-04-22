import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarContent } from "@/components/layout/SidebarContent";
import { Topbar } from "@/components/layout/Topbar";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-background md:flex md:flex-col">
        <SidebarContent user={session} />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={session} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
