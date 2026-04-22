import { ThemeToggle } from "./ThemeToggle";
import { Breadcrumbs } from "./Breadcrumbs";
import { MobileSidebar } from "./MobileSidebar";
import type { SessionUser } from "@/lib/auth";

export function Topbar({ user }: { user: SessionUser }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <MobileSidebar user={user} />
      <div className="flex-1 min-w-0">
        <Breadcrumbs />
      </div>
      <ThemeToggle />
    </header>
  );
}
