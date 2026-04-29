import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";
import type { JobStatus } from "@/types/db";

const statuses: JobStatus[] = ["New", "Assigned", "En Route", "Completed"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { profile, response, supabase } = await requireApiProfile();
  if (response || !profile) return response;
  const body = await request.json();

  const patch: {
    status?: JobStatus;
    technician_id?: string | null;
    technician_assigned_at?: string;
  } = {};

  if (body.status && statuses.includes(body.status)) {
    patch.status = body.status;
  }

  if ("technician_id" in body) {
    patch.technician_id = body.technician_id || null;
    if (body.technician_id) {
      const { data: currentJob } = await supabase
        .from("jobs")
        .select("technician_assigned_at")
        .eq("id", id)
        .eq("company_id", profile.company_id)
        .single();

      if (!currentJob?.technician_assigned_at) {
        patch.technician_assigned_at = new Date().toISOString();
      }
    }
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
