import type { Metadata } from "next";
import MarketingLanding from "@/components/MarketingLanding";

export const metadata: Metadata = {
  title: "HVAC Dispatch That Moves at Field Speed",
  description:
    "Replace manual dispatch chaos with SwiftDispatch: live job tracking, technician updates, and SMS quote approvals.",
  alternates: {
    canonical: "/",
  },
};

export default function LandingPage() {
  return <MarketingLanding />;
}
