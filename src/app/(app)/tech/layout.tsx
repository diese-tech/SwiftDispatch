import SiteFooter from "@/components/SiteFooter";

type TechLayoutProps = {
  children: React.ReactNode;
};

export default function TechLayout({ children }: TechLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex-1">{children}</div>
      <SiteFooter compact />
    </div>
  );
}