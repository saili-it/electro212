import Image from "next/image";
import { requireAdminPage } from "@/data/auth";
import { AdminNav } from "./admin-nav";
import { LogoutButton } from "./logout-button";

export const instant = false;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  CATALOG_MANAGER: "Gestion catalogue",
  ORDER_MANAGER: "Gestion commandes",
  READ_ONLY: "Lecture seule",
};

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {/* The logo artwork has a white background, so it sits on a white tile. */}
      <span className={`flex items-center justify-center rounded-lg bg-white ${compact ? "p-1" : "p-1.5"}`}>
        <Image
          src="/brand/logo.png"
          alt="Electro212"
          width={628}
          height={444}
          priority
          className={compact ? "h-8 w-auto" : "h-11 w-auto"}
        />
      </span>
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Administration</span>
    </div>
  );
}

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const initials = admin.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const userCard = (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green text-xs font-semibold text-brand-navy">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{admin.name}</p>
        <p className="truncate text-xs text-slate-400">{ROLE_LABELS[admin.role] ?? admin.role}</p>
      </div>
      <LogoutButton />
    </div>
  );

  return (
    // Forced light surface: the admin should look the same regardless of the OS dark-mode setting.
    <div className="flex min-h-screen flex-1 bg-surface text-slate-900 [color-scheme:light]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 overflow-y-auto bg-brand-navy px-4 py-6 lg:flex">
        <Brand />
        <AdminNav footer={userCard} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <details className="group border-b border-brand-navy-800 bg-brand-navy lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
            <Brand compact />
            <span className="rounded-md px-2 py-1 text-sm text-slate-300 group-open:bg-white/10">Menu</span>
          </summary>
          <div className="flex flex-col gap-4 px-4 pb-4">
            <AdminNav footer={userCard} />
          </div>
        </details>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
