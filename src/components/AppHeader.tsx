"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type HeaderSection = "admin" | "superadmin" | "dispatch" | "dashboard";

type AppHeaderProps = {
  section: HeaderSection;
  user: {
    email: string;
    role: string;
  };
};

type NavItem = {
  href: string;
  label: string;
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

    if (role === "admin") {
      items.push({ href: "/admin", label: "Admin" });
    }

    return items;
  }

  const items: NavItem[] = [
    { href: "/dispatch", label: "Dispatch" },
    { href: "/analytics", label: "Analytics" },
    { href: "/roi", label: "ROI" },
  ];

  if (role === "admin") {
    items.push({ href: "/admin", label: "Admin" });
  }

  if (role === "super_admin") {
    items.push({ href: "/superadmin", label: "Platform" });
  }

  return items;
}

export default function AppHeader({ section, user }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const navItems = getNavItems(section, user.role);
  const formattedRole = user.role.replace(/_/g, " ");

  async function handleSignOut() {
    setSigningOut(true);

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-teal-700">
              SwiftDispatch
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Internal app navigation
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="text-sm text-slate-600 sm:text-right">
              <p className="font-semibold text-slate-900">{user.email}</p>
              <p className="capitalize">{formattedRole}</p>
            </div>
            <button
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={signingOut}
              onClick={handleSignOut}
              type="button"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-teal-700 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
