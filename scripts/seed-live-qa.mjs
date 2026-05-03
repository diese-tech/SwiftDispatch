import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(envPath);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const COMPANY = {
  name: "Northwind Comfort Live QA",
  slug: "northwind-comfort-live-qa",
  email: "ops@northwind-live-qa.com",
  phone: "555-0101",
  timezone: "America/New_York",
  sms_sender_name: "Northwind",
  payment_provider: "manual",
};

const USERS = {
  admin: { email: "admin@northwind-live-qa.com", password: "serpentine1", role: "admin" },
  dispatcher: { email: "dispatch@northwind-live-qa.com", password: "serpentine1", role: "dispatcher" },
};

const TECHNICIANS = [
  { name: "Olivia Frost", phone: "555-1111", handle: "olifrost", pin: "1111" },
  { name: "Marcus Wells", phone: "555-2222", handle: "marwells", pin: "2222" },
];

const TEMPLATE = {
  name: "Standard Diagnostic + Repair",
  estimated_duration_minutes: 90,
  is_active: true,
  line_items: [
    { description: "Diagnostic visit", unit_price: 89, qty: 1, optional: false },
    { description: "Standard repair labor", unit_price: 110, qty: 1, unit: "hour", optional: false },
    { description: "Parts allowance", unit_price: 75, qty: 1, optional: true },
  ],
};

async function listAllAuthUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
    page += 1;
  }

  return users;
}

async function ensureAuthUser(email, password) {
  const existing = (await listAllAuthUsers()).find((user) => user.email === email);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw error ?? new Error(`Failed to create auth user for ${email}`);
  }

  return data.user;
}

async function ensureUserProfile({ id, email }, companyId, role) {
  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from("users")
      .update({ email, company_id: companyId, role })
      .eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("users").insert({
    id,
    email,
    company_id: companyId,
    role,
  });

  if (error) throw error;
}

async function ensureCompany() {
  const { data: existing, error: existingError } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", COMPANY.slug)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from("companies")
      .update(COMPANY)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("companies")
    .insert(COMPANY)
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create company");
  return data.id;
}

async function ensureTechnician(companyId, tech) {
  const email = `${tech.handle}@internal.swiftdispatch.app`;
  const authUser = await ensureAuthUser(email, tech.pin);
  await ensureUserProfile(authUser, companyId, "technician");

  const { data: existing, error: existingError } = await supabase
    .from("technicians")
    .select("id")
    .eq("company_id", companyId)
    .eq("handle", tech.handle)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from("technicians")
      .update({
        name: tech.name,
        phone: tech.phone,
        handle: tech.handle,
        auth_user_id: authUser.id,
        availability_status: "available",
      })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("technicians")
    .insert({
      company_id: companyId,
      name: tech.name,
      phone: tech.phone,
      handle: tech.handle,
      auth_user_id: authUser.id,
      availability_status: "available",
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error(`Failed to create technician ${tech.name}`);
  return data.id;
}

async function ensureTemplate(companyId) {
  const { data: existing, error: existingError } = await supabase
    .from("quote_templates")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", TEMPLATE.name)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from("quote_templates")
      .update(TEMPLATE)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("quote_templates")
    .insert({ company_id: companyId, ...TEMPLATE })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create template");
  return data.id;
}

async function main() {
  const companyId = await ensureCompany();

  for (const user of Object.values(USERS)) {
    const authUser = await ensureAuthUser(user.email, user.password);
    await ensureUserProfile(authUser, companyId, user.role);
  }

  const technicianIds = [];
  for (const technician of TECHNICIANS) {
    technicianIds.push(await ensureTechnician(companyId, technician));
  }

  const templateId = await ensureTemplate(companyId);

  console.log(
    JSON.stringify(
      {
        company: { id: companyId, ...COMPANY },
        users: USERS,
        technicians: TECHNICIANS.map((tech, index) => ({
          id: technicianIds[index],
          name: tech.name,
          handle: tech.handle,
          pin: tech.pin,
        })),
        template: { id: templateId, name: TEMPLATE.name },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
