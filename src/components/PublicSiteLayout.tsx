import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

type PublicSiteLayoutProps = {
  children: React.ReactNode;
};

export default function PublicSiteLayout({ children }: PublicSiteLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.12),transparent_24%),linear-gradient(180deg,#0a1b2a_0px,#0a1b2a_86px,#edf3f2_86px,#eff5f4_100%)] text-slate-900">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}