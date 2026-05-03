import AppHeader from "@/components/AppHeader";
import SiteFooter from "@/components/SiteFooter";
import type { AppUser } from "@/types/db";

type InternalAppLayoutProps = {
  children: React.ReactNode;
  section: "admin" | "superadmin" | "dispatch" | "dashboard";
  user: Pick<AppUser, "email" | "role">;
};

export default function InternalAppLayout({ children, section, user }: InternalAppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.08),transparent_26%),linear-gradient(180deg,#e8f0ef_0%,#f7fafb_100%)] text-slate-900">
      <AppHeader section={section} user={user} />
      <div className="flex-1 pb-10">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">{children}</div>
      </div>
      <SiteFooter compact />
    </div>
  );
}