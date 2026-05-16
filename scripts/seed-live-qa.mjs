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
  { name: "Olivia Frost", phone: "555-1111", handle: "olifrost", pin: "1111", authPassword: "111111" },
  { name: "Marcus Wells", phone: "555-2222", handle: "marwells", pin: "2222", authPassword: "222222" },
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

// Demo jobs seeded into the QA board so the dispatch board is not blank on first login.
// All jobs are flagged is_demo=true and use clearly fake phone numbers.
// Statuses cover the full active lifecycle for acceptance testing.
const DEMO_JOBS = [
  {
    customerName: "Riverside Dental",
    phone: "+15550010001",
    address: "240 Riverside Blvd",
    issue: "AC not cooling — patients complaining",
    problemDescription: "Main AC unit stopped cooling entirely. Office is getting warm.",
    status: "new",
    urgency: "emergency",
    source: "intake",
    techIndex: null,
    ageMinutes: 12,
  },
  {
    customerName: "Peak Fitness Studio",
    phone: "+15550030003",
    address: "900 Summit Ave",
    issue: "Rooftop unit cycling on and off",
    problemDescription: "RTU runs for about 3 minutes then shuts off. Repeating every 10 minutes.",
    status: "assigned",
    urgency: "same_day",
    source: "manual",
    techIndex: 0,
    ageMinutes: 95,
  },
  {
    customerName: "Wilkins Family",
    phone: "+15550050005",
    address: "312 Wilkins Way",
    issue: "Furnace short cycling every few minutes",
    problemDescription: "Gas furnace starts, runs 2–3 minutes, then shuts off. House not reaching set temp.",
    status: "en_route",
    urgency: "same_day",
    source: "intake",
    techIndex: 1,
    ageMinutes: 140,
  },
  {
    customerName: "Harbor Point Restaurant",
    phone: "+15550070007",
    address: "1 Harbor Point Ln",
    issue: "Kitchen walk-in cooler down before dinner service",
    problemDescription: "Walk-in cooler compressor won't start. Dinner service in 3 hours.",
    status: "in_progress",
    urgency: "emergency",
    source: "call",
    techIndex: 0,
    ageMinutes: 175,
  },
  {
    customerName: "Sunridge Office Park",
    phone: "+15550090009",
    address: "2200 Sunridge Pkwy",
    issue: "RTU diagnostic — compressor noise",
    problemDescription: "Rooftop unit making grinding noise on startup. Quote sent for compressor bearing.",
    status: "quote_pending",
    urgency: "scheduled",
    source: "manual",
    techIndex: 1,
    ageMinutes: 350,
    quote: [
      { name: "RTU diagnostic", price: 179, quantity: 1 },
      { name: "Compressor bearing replacement", price: 490, quantity: 1 },
      { name: "Labor — compressor work", price: 145, quantity: 2 },
    ],
    quoteStatus: "sent",
  },
  {
    customerName: "Downtown Cafe",
    phone: "+15550120012",
    address: "15 Main Street",
    issue: "Emergency — AC down during afternoon rush",
    problemDescription: "Capacitor failure on main AC unit. Replaced and tested. Fully restored.",
    status: "completed",
    urgency: "emergency",
    source: "call",
    techIndex: 0,
    ageMinutes: 590,
    quote: [
      { name: "Emergency callout fee", price: 150, quantity: 1 },
      { name: "Capacitor replacement", price: 180, quantity: 1 },
      { name: "System test and commissioning", price: 75, quantity: 1 },
    ],
    quoteStatus: "accepted",
  },
];

async function ensureJobs(companyId, technicianIds) {
  const { data: existingJobs } = await supabase
    .from("jobs")
    .select("customer_name")
    .eq("company_id", companyId)
    .eq("is_demo", true);

  const now = Date.now();

  for (const demoJob of DEMO_JOBS) {
    const prefixedName = `QA - ${demoJob.customerName}`;
    if (existingJobs?.some((j) => j.customer_name === prefixedName)) continue;

    const createdAt = new Date(now - demoJob.ageMinutes * 60_000);
    const assignedAt = new Date(createdAt.getTime() + 8 * 60_000);
    const enRouteAt = new Date(createdAt.getTime() + 18 * 60_000);
    const arrivedAt = new Date(createdAt.getTime() + 40 * 60_000);
    const quoteAt = new Date(createdAt.getTime() + 55 * 60_000);
    const quoteSentAt = new Date(createdAt.getTime() + 58 * 60_000);
    const completedAt = new Date(createdAt.getTime() + 90 * 60_000);

    const isAssigned = !["new", "cancelled"].includes(demoJob.status);
    const techId = demoJob.techIndex !== null ? (technicianIds[demoJob.techIndex] ?? null) : null;

    const jobPayload = {
      customer_name: prefixedName,
      phone: demoJob.phone,
      address: demoJob.address,
      issue: demoJob.issue,
      problem_description: demoJob.problemDescription,
      status: demoJob.status,
      urgency: demoJob.urgency,
      source: demoJob.source,
      sms_consent_type: demoJob.source === "intake" ? "intake_form" : "verbal_logged",
      technician_id: isAssigned ? techId : null,
      company_id: companyId,
      created_at: createdAt.toISOString(),
      is_demo: true,
      ...(isAssigned && { assigned_at: assignedAt.toISOString() }),
      ...(["en_route", "in_progress", "quote_pending", "completed"].includes(demoJob.status) && {
        en_route_at: enRouteAt.toISOString(),
      }),
      ...(["in_progress", "quote_pending", "completed"].includes(demoJob.status) && {
        arrived_at: arrivedAt.toISOString(),
      }),
      ...(demoJob.status === "completed" && { completed_at: completedAt.toISOString() }),
    };

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert(jobPayload)
      .select("id")
      .single();

    if (jobError || !job) {
      console.error(`Failed to insert job for ${prefixedName}:`, jobError?.message);
      continue;
    }

    // Status event history
    const events = [
      { from: null, to: "new", offsetMs: 0, role: demoJob.source === "intake" ? "customer" : "dispatcher" },
    ];
    if (isAssigned) events.push({ from: "new", to: "assigned", offsetMs: 8 * 60_000, role: "dispatcher" });
    if (["en_route", "in_progress", "quote_pending", "completed"].includes(demoJob.status))
      events.push({ from: "assigned", to: "en_route", offsetMs: 18 * 60_000, role: "technician" });
    if (["in_progress", "quote_pending", "completed"].includes(demoJob.status))
      events.push({ from: "en_route", to: "in_progress", offsetMs: 40 * 60_000, role: "technician" });
    if (["quote_pending", "completed"].includes(demoJob.status))
      events.push({ from: "in_progress", to: "quote_pending", offsetMs: 60 * 60_000, role: "technician" });
    if (demoJob.status === "completed")
      events.push({ from: "quote_pending", to: "completed", offsetMs: 90 * 60_000, role: "customer" });

    await supabase.from("status_events").insert(
      events.map((e) => ({
        job_id: job.id,
        from_status: e.from,
        to_status: e.to,
        actor_role: e.role,
        created_at: new Date(createdAt.getTime() + e.offsetMs).toISOString(),
      })),
    );

    // Quote and line items
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
}

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
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw error ?? new Error(`Failed to refresh auth user for ${email}`);
    }

    return data.user;
  }

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
  const authUser = await ensureAuthUser(email, tech.authPassword ?? tech.pin);
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
  await ensureJobs(companyId, technicianIds);

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
        demoJobsSeeded: DEMO_JOBS.length,
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
