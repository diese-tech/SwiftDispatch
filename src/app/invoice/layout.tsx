import InternalAppLayout from "@/components/InternalAppLayout";
import { getCurrentProfile } from "@/lib/auth";

export default async function InvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <InternalAppLayout
      section="dispatch"
      user={{ email: profile.email, role: profile.role }}
    >
      {children}
    </InternalAppLayout>
  );
}
