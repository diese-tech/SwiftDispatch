import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";
import type { CloseStatus } from "@/types/db";

const closeStatuses: CloseStatus[] = [
  "not_contacted",
  "contacted",
  "demo_done",
  "interested",
  "closed_won",
  "closed_lost",
];

export async function PATCH(request: Request) {
  const { profile, response, supabase } = await requireApiProfile();
  if (response || !profile) return response;
  const { close_status } = (await request.json()) as {
    close_status?: CloseStatus;
  };

  if (!close_status || !closeStatuses.includes(close_status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("companies")
    .update({ close_status })
    .eq("id", profile.company_id)
    .select("id,close_status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ company: data });
}
