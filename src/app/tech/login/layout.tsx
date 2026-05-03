import SiteHeader from "@/components/SiteHeader";

type TechLoginLayoutProps = {
  children: React.ReactNode;
};

export default function TechLoginLayout({ children }: TechLoginLayoutProps) {
  return (
    <div className="flex flex-1 flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f6_48%,#ffffff_100%)]">
      <SiteHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}