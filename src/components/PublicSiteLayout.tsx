import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

type PublicSiteLayoutProps = {
  children: React.ReactNode;
};

export default function PublicSiteLayout({ children }: PublicSiteLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f6_48%,#ffffff_100%)] text-slate-900">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}