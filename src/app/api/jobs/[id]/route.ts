import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/types/db";

const statuses: JobStatus[] = ["New", "Assigned", "En Route", "Completed"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const body = await request.json();
  const supabase = await createSupabaseServerClient();

  const patch: { status?: JobStatus; technician_id?: string | null } = {};

  if (body.status && statuses.includes(body.status)) {
    patch.status = body.status;
  }

  if ("technician_id" in body) {
    patch.technician_id = body.technician_id || null;
  }

  const { data, error } = await supabase
    .from("jobs")
    .update(patch)
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .select("*, technicians(id,name,phone)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ job: data });
}
