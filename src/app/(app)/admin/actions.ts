"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireAdminProfile, requireSuperAdminProfile } from "@/lib/auth";
import { demoJobs, demoTechnicians } from "@/lib/demo-data";
import { isSeedDemoEnabled } from "@/lib/featureFlags";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { JobStatus } from "@/types/db";

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createCompanyAction(formData: FormData) {
  await requireSuperAdminProfile();
  const supabase = createSupabaseAdminClient();
  const name = stringValue(formData, "company_name");
  const email = stringValue(formData, "email") || null;
  const phone = stringValue(formData, "phone") || null;

  if (!name) return;

  const { data, error } = await supabase
    .from("companies")
    .insert({ name, email, phone })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Company could not be created");
  }

  revalidatePath("/admin");
  redirect(`/admin?created_company_id=${data.id}`);
}

export async function createDispatcherAction(formData: FormData) {
  const profile = await requireAdminProfile();
  const supabase = createSupabaseAdminClient();
  const email = stringValue(formData, "email");
  const password = stringValue(formData, "password");
  const companyId = profile.company_id;

  if (!email || !password || !companyId) return;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Dispatcher user could not be created");
  }

  const { error: profileError } = await supabase.from("users").insert({
    id: data.user.id,
    email,
    company_id: companyId,
    role: "dispatcher",
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/admin");
}

export async function addTechniciansAction(formData: FormData) {
  const profile = await requireAdminProfile();
  const supabase = createSupabaseAdminClient();
  const companyId = profile.company_id;
  const singleName = stringValue(formData, "name");
  const singlePhone = stringValue(formData, "phone");
  const bulk = stringValue(formData, "bulk");

  if (!companyId) return;

  const technicians = [
    ...(singleName ? [{ name: singleName, phone: singlePhone || null }] : []),
    ...bulk
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, phone] = line.split(",").map((part) => part.trim());
        return { name, phone: phone || null };
      })
      .filter((tech) => tech.name),
  ];

  if (!technicians.length) return;

  await supabase.from("technicians").insert(
    technicians.map((tech) => ({
      ...tech,
      company_id: companyId,
    })),
  );

  revalidatePath("/admin");
}

export async function seedDemoAction(formData: FormData) {
  if (!isSeedDemoEnabled()) notFound();

  const profile = await requireAdminProfile();
  const supabase = createSupabaseAdminClient();
  const companyId = profile.company_id;

  if (!companyId) return;

  await supabase
    .from("companies")
    .update({ demo_mode_enabled: true, close_status: "demo_done" })
    .eq("id", companyId);

  // Ensure demo technicians exist
  const { data: existingTechs } = await supabase
    .from("technicians")
    .select("id,name")
    .eq("company_id", companyId);

  const missingTechs = demoTechnicians.filter(
    (tech) => !existingTechs?.some((existing: { name: string }) => existing.name === tech.name),
  );

  if (missingTechs.length) {
    await supabase.from("technicians").insert(
      missingTechs.map((tech) => ({ ...tech, company_id: companyId })),
    );
  }

  const { data: technicians } = await supabase
    .from("technicians")
    .select("id,name")
    .eq("company_id", companyId)
    .in("name", demoTechnicians.map((t) => t.name));

  // Fetch existing demo jobs by their prefixed customer name to avoid duplication
  const { data: existingJobs } = await supabase
    .from("jobs")
    .select("customer_name")
    .eq("company_id", companyId)
    .eq("is_demo", true);

  const now = Date.now();

  for (const demoJob of demoJobs) {
    const prefixedName = `DEMO - ${demoJob.customerName}`;

    if (existingJobs?.some((j: { customer_name: string }) => j.customer_name === prefixedName)) {
      continue;
    }

    const techList = technicians ?? [];
    const technician =
      demoJob.techIndex !== null ? (techList[demoJob.techIndex] ?? null) : null;

    const createdAt = new Date(now - demoJob.ageMinutes * 60_000);
    const assignedAt = new Date(createdAt.getTime() + 8 * 60_000);
    const enRouteAt = new Date(createdAt.getTime() + 18 * 60_000);
    const arrivedAt = new Date(createdAt.getTime() + 40 * 60_000);
    const quoteAt = new Date(createdAt.getTime() + 55 * 60_000);
    const quoteSentAt = new Date(createdAt.getTime() + 58 * 60_000);
    const completedAt = new Date(createdAt.getTime() + 90 * 60_000);

    const isAssigned = !["new", "cancelled"].includes(demoJob.status);

    const jobPayload: Record<string, unknown> = {
      customer_name: prefixedName,
      phone: demoJob.phone,
      address: demoJob.address,
      issue: demoJob.issue,
      problem_description: demoJob.problemDescription,
      status: demoJob.status as JobStatus,
      urgency: demoJob.urgency,
      source: demoJob.source,
      sms_consent_type: demoJob.source === "intake" ? "intake_form" : "verbal_logged",
      technician_id: isAssigned ? (technician?.id ?? null) : null,
      company_id: companyId,
      created_at: createdAt.toISOString(),
      is_demo: true,
    };

    if (isAssigned) jobPayload.assigned_at = assignedAt.toISOString();
    if (["en_route", "in_progress", "quote_pending", "completed", "no_access"].includes(demoJob.status)) {
      jobPayload.en_route_at = enRouteAt.toISOString();
    }
    if (["in_progress", "quote_pending", "completed", "no_access"].includes(demoJob.status)) {
      jobPayload.arrived_at = arrivedAt.toISOString();
    }
    if (demoJob.status === "completed") {
      jobPayload.completed_at = completedAt.toISOString();
    }
    if (demoJob.status === "cancelled") {
      jobPayload.cancellation_reason = "Customer requested cancellation before dispatch.";
      jobPayload.cancelled_at = new Date(createdAt.getTime() + 15 * 60_000).toISOString();
    }

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert(jobPayload)
      .select("id")
      .single();

    if (jobError || !job) continue;

    // Seed status event history for each transition that has occurred
    const events: Array<{ from: string | null; to: string; offsetMs: number; role: string }> = [
      { from: null, to: "new", offsetMs: 0, role: demoJob.source === "intake" ? "customer" : "dispatcher" },
    ];

    if (isAssigned) {
      events.push({ from: "new", to: "assigned", offsetMs: 8 * 60_000, role: "dispatcher" });
    }
    if (["en_route", "in_progress", "quote_pending", "completed", "no_access"].includes(demoJob.status)) {
      events.push({ from: "assigned", to: "en_route", offsetMs: 18 * 60_000, role: "technician" });
    }
    if (["in_progress", "quote_pending", "completed", "no_access"].includes(demoJob.status)) {
      events.push({ from: "en_route", to: "in_progress", offsetMs: 40 * 60_000, role: "technician" });
    }
    if (["quote_pending", "completed"].includes(demoJob.status)) {
      events.push({ from: "in_progress", to: "quote_pending", offsetMs: 60 * 60_000, role: "technician" });
    }
    if (demoJob.status === "completed") {
      events.push({ from: "quote_pending", to: "completed", offsetMs: 90 * 60_000, role: "customer" });
    }
    if (demoJob.status === "no_access") {
      events.push({ from: "in_progress", to: "no_access", offsetMs: 55 * 60_000, role: "technician" });
    }
    if (demoJob.status === "cancelled") {
      events.push({ from: "new", to: "cancelled", offsetMs: 15 * 60_000, role: "dispatcher" });
    }

    await supabase.from("status_events").insert(
      events.map((e) => ({
        job_id: job.id,
        from_status: e.from,
        to_status: e.to,
        actor_role: e.role,
        created_at: new Date(createdAt.getTime() + e.offsetMs).toISOString(),
      })),
    );

    // Seed quote and line items for relevant statuses
    if (demoJob.quote && demoJob.quoteStatus) {
      const total = demoJob.quote.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const { data: quote } = await supabase
        .from("quotes")
        .insert({
          job_id: job.id,
          total,
          total_amount: total,
          status: demoJob.quoteStatus,
          created_at: quoteAt.toISOString(),
          quote_sent_at: quoteSentAt.toISOString(),
          accepted_at:
            demoJob.quoteStatus === "accepted"
              ? new Date(quoteSentAt.getTime() + 18 * 60_000).toISOString()
              : null,
          is_demo: true,
        })
        .select("id")
        .single();

      if (quote) {
        await supabase.from("quote_line_items").insert(
          demoJob.quote.map((item) => ({
            quote_id: quote.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        );
      }
    }
  }

  revalidatePath("/admin");
}

export async function resetCompanyDataAction(formData: FormData) {
  const profile = await requireAdminProfile();
  const supabase = createSupabaseAdminClient();
  const companyId = profile.company_id;

  if (!companyId) return;

  // Only delete demo-flagged jobs so a reset cannot wipe live operational data.
  await supabase.from("jobs").delete().eq("company_id", companyId).eq("is_demo", true);
  await supabase
    .from("companies")
    .update({ demo_mode_enabled: false })
    .eq("id", companyId);

  revalidatePath("/admin");
}
