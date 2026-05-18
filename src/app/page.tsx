import MarketingLanding from "@/components/MarketingLanding";
import PublicSiteLayout from "@/components/PublicSiteLayout";

export { metadata } from "./(marketing)/page";

export default function RootPage() {
  return (
    <PublicSiteLayout>
      <MarketingLanding />
    </PublicSiteLayout>
  );
}
