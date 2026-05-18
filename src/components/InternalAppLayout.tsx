import AppSidebar from "@/components/AppSidebar";
import DemoBanner from "@/components/DemoBanner";
import type { AppUser } from "@/types/db";

type InternalAppLayoutProps = {
  children: React.ReactNode;
  section: "admin" | "superadmin" | "dispatch" | "dashboard";
  user: Pick<AppUser, "email" | "role">;
};

export default function InternalAppLayout({ children, section, user }: InternalAppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--c-paper-2)] text-[var(--c-text)] lg:flex-row">
      <AppSidebar section={section} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner />
        <main className="flex-1 px-5 py-6 sm:px-8">{children}</main>
        <footer className="border-t border-[var(--c-line)] px-5 py-3 sm:px-8">
          <p className="font-mono text-[10px] text-[var(--c-text-4)]">
            © {new Date().getFullYear()} SwiftDispatch
          </p>
        </footer>
      </div>
    </div>
  );
}
