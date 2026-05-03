import InternalAppLayout from "@/components/InternalAppLayout";
import { requireSuperAdminProfile } from "@/lib/auth";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireSuperAdminProfile();

  return (
    <InternalAppLayout
      section="superadmin"
      user={{ email: profile.email, role: profile.role }}
    >
      {children}
    </InternalAppLayout>
  );
}
