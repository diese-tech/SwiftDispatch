import InternalAppLayout from "@/components/InternalAppLayout";
import { requireAdminProfile } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdminProfile();

  return (
    <InternalAppLayout
      section="admin"
      user={{ email: profile.email, role: profile.role }}
    >
      {children}
    </InternalAppLayout>
  );
}
