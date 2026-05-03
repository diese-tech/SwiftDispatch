import PublicSiteLayout from "@/components/PublicSiteLayout";

type DemoLayoutProps = {
  children: React.ReactNode;
};

export default function DemoLayout({ children }: DemoLayoutProps) {
  return <PublicSiteLayout>{children}</PublicSiteLayout>;
}
