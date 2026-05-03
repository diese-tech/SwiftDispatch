"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import BrandMark from "@/components/BrandMark";
import { StatusPill } from "@/components/DesignSystem";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type HeaderSection = "admin" | "superadmin" | "dispatch" | "dashboard";
type NavItem = { href: string; label: string };

type AppHeaderProps = {
  section: HeaderSection;
  user: { email: string; role: string };
};

function getNavItems(section: HeaderSection, role: string): NavItem[] {
  if (section === "admin") {
    return [
      { href: "/dispatch", label: "Dispatch" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/technicians", label: "Technicians" },
      { href: "/admin/templates", label: "Templates" },
      { href: "/admin/users", label: "Users" },
    ];
  }
  if (section === "superadmin") {
    return [
      { href: "/superadmin", label: "Platform" },
      { href: "/superadmin/companies/new", label: "New Company" },
      { href: "/dispatch", label: "Dispatch" },
    ];
  }
  if (section === "dashboard") {
    const items: NavItem[] = [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/analytics", label: "Analytics" },
      { href: "/roi", label: "ROI" },
      { href: "/dispatch", label: "Dispatch" },
    ];
    if (role === "admin") items.push({ href: "/admin", label: "Admin" });
    return items;
  }
  const items: NavItem[] = [
    { href: "/dispatch", label: "Dispatch" },
    { href: "/analytics", label: "Analytics" },
    { href: "/roi", label: "ROI" },
  ];
  if (role === "admin") items.push({ href: "/admin", label: "Admin" });
  if (role === "super_admin") items.push({ href: "/superadmin", label: "Platform" });
  return items;
}

export default function AppHeader({ section, user }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const navItems = useMemo(() => getNavItems(section, user.role), [section, user.role]);
  const formattedRole = user.role.replace(/_/g, " ");

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="no-print border-b border-white/10 bg-[linear-gradient(180deg,rgba(7,25,39,0.98)_0%,rgba(9,31,47,0.98)_100%)] text-white shadow-[var(--shadow-md)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <BrandMark href="/dispatch" inverse />
            <p className="mt-4 text-sm leading-6 text-slate-300">A calmer operating shell for dispatch, quoting, and team coordination.</p>
          </div>
          <div className="flex flex-col items-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 sm:min-w-[280px] sm:items-end">
            <StatusPill tone="warm">{formattedRole}</StatusPill>
            <div className="text-sm text-slate-200 sm:text-right">
              <p className="font-semibold text-white">{user.email}</p>
              <p className="mt-1 text-slate-300">Signed into the internal workspace</p>
            </div>
            <button className="rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60" disabled={signingOut} onClick={handleSignOut} type="button">
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link className={isActive ? "rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition" : "rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"} href={item.href} key={item.href}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}