import InternalAppLayout from "@/components/InternalAppLayout";
import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <InternalAppLayout
      section="dashboard"
      user={{ email: profile.email, role: profile.role }}
    >
      {children}
    </InternalAppLayout>
  );
}
