import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { demoJobs, demoTechnicians } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/types/db";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  const { enabled } = (await request.json()) as { enabled: boolean };
  const supabase = await createSupabaseServerClient();

  const companyPatch = enabled
    ? { name: "Summit Air Demo Co", demo_mode_enabled: true }
    : { demo_mode_enabled: false };
  const { error: companyError } = await supabase
    .from("companies")
    .update(companyPatch)
    .eq("id", profile.company_id);

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 400 });
  }

  if (!enabled) {
    return NextResponse.json({ enabled });
  }

  const { data: existingTechs } = await supabase
    .from("technicians")
    .select("id,name")
    .eq("company_id", profile.company_id);

  const missingTechs = demoTechnicians.filter(
    (tech) => !existingTechs?.some((existing) => existing.name === tech.name),
  );

  if (missingTechs.length) {
    await supabase.from("technicians").insert(
      missingTechs.map((tech) => ({
        ...tech,
        company_id: profile.company_id,
      })),
    );
  }

  const { data: technicians } = await supabase
    .from("technicians")
    .select("id,name")
    .eq("company_id", profile.company_id)
    .in(
      "name",
      demoTechnicians.map((tech) => tech.name),
    );

  const { data: existingJobs } = await supabase
    .from("jobs")
    .select("id,customer_name")
    .eq("company_id", profile.company_id)
    .in(
      "customer_name",
      demoJobs.map((job) => job.customer_name),
    );

  for (const [index, demoJob] of demoJobs.entries()) {
    if (existingJobs?.some((job) => job.customer_name === demoJob.customer_name)) {
      continue;
    }

    const techList = technicians ?? [];
    const technician = techList[index % Math.max(techList.length, 1)];
    const assigned = demoJob.status !== "New";
    const createdAt = new Date(Date.now() - (index + 1) * 52 * 60 * 1000);
    const assignedAt = new Date(createdAt.getTime() + 8 * 60 * 1000);
    const quoteAt = new Date(createdAt.getTime() + 18 * 60 * 1000);
    const sentAt = new Date(createdAt.getTime() + 21 * 60 * 1000);

    const { data: job } = await supabase
      .from("jobs")
      .insert({
        customer_name: demoJob.customer_name,
        phone: demoJob.phone,
        address: demoJob.address,
        issue: demoJob.issue,
        status: demoJob.status as JobStatus,
        technician_id: assigned ? technician?.id : null,
        technician_assigned_at: assigned ? assignedAt.toISOString() : null,
        company_id: profile.company_id,
        created_at: createdAt.toISOString(),
      })
      .select("id")
      .single();

    if (!job) continue;

    const total = demoJob.quote.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const { data: quote } = await supabase
      .from("quotes")
      .insert({
        job_id: job.id,
        total,
        status: index === 3 ? "accepted" : "sent",
        created_at: quoteAt.toISOString(),
        quote_sent_at: sentAt.toISOString(),
        accepted_at:
          index === 3
            ? new Date(sentAt.getTime() + 14 * 60 * 1000).toISOString()
            : null,
      })
      .select("id")
      .single();

    if (quote) {
      await supabase.from("quote_line_items").insert(
        demoJob.quote.map((item) => ({
          quote_id: quote.id,
          ...item,
        })),
      );
    }
  }

  return NextResponse.json({ enabled });
}
