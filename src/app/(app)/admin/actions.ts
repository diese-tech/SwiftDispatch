"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminProfile, requireSuperAdminProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

