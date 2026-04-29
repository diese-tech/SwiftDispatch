"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminProfile } from "@/lib/auth";
import { demoJobs, demoTechnicians } from "@/lib/demo-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { JobStatus } from "@/types/db";

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createCompanyAction(formData: FormData) {
  await requireAdminProfile();
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
  await requireAdminProfile();
  const supabase = createSupabaseAdminClient();
  const email = stringValue(formData, "email");
  const password = stringValue(formData, "password");
  const companyId = stringValue(formData, "company_id");

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
  await requireAdminProfile();
  const supabase = createSupabaseAdminClient();
  const companyId = stringValue(formData, "company_id");
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
  await requireAdminProfile();
  const supabase = createSupabaseAdminClient();
  const companyId = stringValue(formData, "company_id");

  if (!companyId) return;

  await supabase
    .from("companies")
    .update({ demo_mode_enabled: true, close_status: "demo_done" })
    .eq("id", companyId);

  const { data: existingTechs } = await supabase
    .from("technicians")
    .select("id,name")
    .eq("company_id", companyId);

  const missingTechs = demoTechnicians.filter(
    (tech) => !existingTechs?.some((existing) => existing.name === tech.name),
  );

  if (missingTechs.length) {
    await supabase.from("technicians").insert(
      missingTechs.map((tech) => ({
        ...tech,
        company_id: companyId,
      })),
    );
  }

  const { data: technicians } = await supabase
    .from("technicians")
    .select("id,name")
    .eq("company_id", companyId)
    .in(
      "name",
      demoTechnicians.map((tech) => tech.name),
    );

  const { data: existingJobs } = await supabase
    .from("jobs")
    .select("customer_name")
    .eq("company_id", companyId)
    .eq("is_demo", true);

  for (const [index, demoJob] of demoJobs.entries()) {
    if (existingJobs?.some((job) => job.customer_name === demoJob.customer_name)) {
      continue;
    }

    const techList = technicians ?? [];
    const technician = techList[index % Math.max(techList.length, 1)];
    const assigned = demoJob.status !== "New";
    const createdAt = new Date(Date.now() - (index + 1) * 45 * 60 * 1000);
    const assignedAt = new Date(createdAt.getTime() + 9 * 60 * 1000);
    const quoteAt = new Date(createdAt.getTime() + 22 * 60 * 1000);
    const sentAt = new Date(createdAt.getTime() + 25 * 60 * 1000);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        customer_name: `DEMO - ${demoJob.customer_name}`,
        phone: demoJob.phone,
        address: demoJob.address,
        issue: demoJob.issue,
        status: demoJob.status as JobStatus,
        technician_id: assigned ? technician?.id : null,
        technician_assigned_at: assigned ? assignedAt.toISOString() : null,
        company_id: companyId,
        created_at: createdAt.toISOString(),
        is_demo: true,
      })
      .select("id")
      .single();

    if (jobError || !job) continue;

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
        is_demo: true,
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

  revalidatePath("/admin");
}

export async function resetCompanyDataAction(formData: FormData) {
  await requireAdminProfile();
  const supabase = createSupabaseAdminClient();
  const companyId = stringValue(formData, "company_id");

  if (!companyId) return;

  await supabase.from("jobs").delete().eq("company_id", companyId);
  await supabase
    .from("companies")
    .update({ demo_mode_enabled: false })
    .eq("id", companyId);

  revalidatePath("/admin");
}
