import AppHeader from "@/components/AppHeader";
import SiteFooter from "@/components/SiteFooter";
import type { AppUser } from "@/types/db";

type InternalAppLayoutProps = {
  children: React.ReactNode;
  section: "admin" | "superadmin" | "dispatch" | "dashboard";
  user: Pick<AppUser, "email" | "role">;
};

export default function InternalAppLayout({
  children,
  section,
  user,
}: InternalAppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader section={section} user={user} />
      <div className="flex-1 pb-10">{children}</div>
      <SiteFooter compact />
    </div>
  );
}