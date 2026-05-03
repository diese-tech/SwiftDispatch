import AppHeader from "@/components/AppHeader";
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
    <div className="min-h-screen bg-slate-50">
      <AppHeader section={section} user={user} />
      <div className="pb-10">{children}</div>
    </div>
  );
}
