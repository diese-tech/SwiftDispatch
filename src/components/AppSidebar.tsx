"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Section = "admin" | "superadmin" | "dispatch" | "dashboard";
type NavItem = { href: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

function getNavGroups(section: Section, role: string): NavGroup[] {
  const dispatchHref = role === "super_admin" ? "/superadmin/dispatch" : "/dispatch";

  if (section === "superadmin") {
    return [
      {
        label: "Platform",
        items: [
          { href: "/superadmin", label: "Companies" },
          { href: "/superadmin/companies/new", label: "New company" },
          { href: "/superadmin/dispatch", label: "Dispatch" },
        ],
      },
    ];
  }

  const workspaceItems: NavItem[] = [
    { href: dispatchHref, label: "Dispatch" },
    { href: "/analytics", label: "Analytics" },
  ];

  if (section === "admin" || role === "admin") {
    return [
      { label: "Workspace", items: workspaceItems },
      {
        label: "Admin",
        items: [
          { href: "/admin", label: "Overview" },
          { href: "/admin/settings", label: "Settings" },
          { href: "/admin/technicians", label: "Technicians" },
          { href: "/admin/templates", label: "Templates" },
          { href: "/admin/users", label: "Users" },
        ],
      },
    ];
  }

  return [{ label: "Workspace", items: workspaceItems }];
}

type Props = {
  section: Section;
  user: { email: string; role: string };
};

export default function AppSidebar({ section, user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navGroups = getNavGroups(section, user.role);
  const homeHref = user.role === "super_admin" ? "/superadmin" : "/dispatch";

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navContent = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-2 font-mono text-[10px] uppercase tracking-[0.07em] text-[var(--c-text-4)]">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                    isActive
                      ? "bg-[var(--c-paper-3)] font-medium text-[var(--c-text)]"
                      : "text-[var(--c-text-2)] hover:bg-[var(--c-paper-3)] hover:text-[var(--c-text)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const footerContent = (
    <div className="border-t border-[var(--c-line)] px-3 py-3">
      <p className="truncate font-mono text-[10px] text-[var(--c-text-3)]">{user.email}</p>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="mt-1 text-[12px] text-[var(--c-text-4)] transition-colors hover:text-[var(--c-text)] disabled:opacity-50"
        type="button"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="no-print hidden w-[216px] shrink-0 flex-col border-r border-[var(--c-line)] bg-[var(--c-paper-2)] lg:flex"
        style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}
      >
        <div className="border-b border-[var(--c-line)] px-4 py-3.5">
          <BrandMark href={homeHref} size="sm" />
        </div>
        {navContent}
        {footerContent}
      </aside>

      {/* Mobile topbar */}
      <div className="no-print flex items-center justify-between border-b border-[var(--c-line)] bg-[var(--c-paper)] px-4 py-3 lg:hidden">
        <BrandMark href={homeHref} size="sm" />
        <button
          onClick={() => setMobileOpen((o) => !o)}
          type="button"
          className="text-[var(--c-text-3)]"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile overlay menu */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 flex flex-col bg-[var(--c-paper)] lg:hidden">
          <div className="flex items-center justify-between border-b border-[var(--c-line)] px-4 py-3">
            <BrandMark href={homeHref} size="sm" />
            <button
              onClick={() => setMobileOpen(false)}
              type="button"
              className="text-[var(--c-text-3)]"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          </div>
          {navContent}
          {footerContent}
        </div>
      )}
    </>
  );
}
