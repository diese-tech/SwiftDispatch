/**
 * One-time setup for the public demo tenant.
 *
 * Creates the demo company, public login user (demo / demo), technicians,
 * and quote template — then seeds the initial job set.
 *
 * Safe to re-run: all operations are idempotent.
 *
 * After initial setup, daily resets are handled automatically by the
 * Vercel cron job calling POST /api/internal/reset-demo (05:00 UTC = 00:00 EST).
 *
 * Usage:
 *   node scripts/seed-demo-tenant.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

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

loadEnvFile(path.join(repoRoot, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const DEMO_COMPANY_SLUG = "swiftdispatch-demo";

const COMPANY = {
  name: "SwiftDispatch Demo",
  slug: DEMO_COMPANY_SLUG,
  email: "demo@swiftdispatch.app",
  phone: "555-0100",
  timezone: "America/New_York",
  sms_sender_name: "SwiftDispatch",
  payment_provider: "manual",
  demo_mode_enabled: true,
};

// Public demo credentials — safe to display on marketing pages
const DEMO_USER = {
  email: "demo@swiftdispatch.app",
  password: "demo",
  role: "dispatcher",
};

const TECHNICIANS = [
  { name: "Mia Torres",   phone: "+15551234567", handle: "miatorres",  pin: "1234", authPassword: "123456" },
  { name: "Leo Grant",    phone: "+15557654321", handle: "leogrant",   pin: "5678", authPassword: "567890" },
  { name: "Avery Brooks", phone: "+15553459876", handle: "averybrooks", pin: "9012", authPassword: "901234" },
];

const TEMPLATE = {
  name: "Standard Diagnostic + Repair",
  estimated_duration_minutes: 90,
  is_active: true,
  line_items: [
    { description: "Diagnostic visit",       unit_price: 89,  qty: 1, optional: false },
    { description: "Standard repair labor",  unit_price: 110, qty: 1, optional: false },
    { description: "Parts allowance",        unit_price: 75,  qty: 1, optional: true  },
  ],
};

// ─── Demo jobs ────────────────────────────────────────────────────────────────
// Mirrors src/lib/demo-data.ts so the reset API and this script stay in sync.
// Update both if the job set changes.
const DEMO_JOBS = [
  { customerName: "Riverside Dental",    phone: "+15550010001", address: "240 Riverside Blvd",       issue: "AC not cooling — patients complaining",           status: "new",           urgency: "emergency", source: "intake", techIndex: null, ageMinutes: 12 },
  { customerName: "Carmichael Home",     phone: "+15550020002", address: "18 Carmichael Ct",          issue: "Central heat not turning on",                      status: "new",           urgency: "same_day",  source: "call",   techIndex: null, ageMinutes: 55 },
  { customerName: "Peak Fitness Studio", phone: "+15550030003", address: "900 Summit Ave",            issue: "Rooftop unit cycling on and off",                   status: "assigned",      urgency: "same_day",  source: "manual", techIndex: 0,    ageMinutes: 95 },
  { customerName: "River Oaks Bakery",   phone: "+15550040004", address: "45 River Oaks Dr",          issue: "Walk-in cooler alarm triggered",                    status: "assigned",      urgency: "emergency", source: "call",   techIndex: 1,    ageMinutes: 38 },
  { customerName: "Wilkins Family",      phone: "+15550050005", address: "312 Wilkins Way",           issue: "Furnace short cycling every few minutes",           status: "en_route",      urgency: "same_day",  source: "intake", techIndex: 2,    ageMinutes: 140 },
  { customerName: "Bridgeview Pharmacy", phone: "+15550060006", address: "77 Bridgeview Rd",          issue: "East zone not cooling — refrigeration section warm", status: "en_route",      urgency: "emergency", source: "call",   techIndex: 0,    ageMinutes: 190 },
  { customerName: "Harbor Point Restaurant", phone: "+15550070007", address: "1 Harbor Point Ln",    issue: "Kitchen walk-in cooler down before dinner service",  status: "in_progress",   urgency: "emergency", source: "call",   techIndex: 1,    ageMinutes: 175 },
  { customerName: "Miller Apartments",   phone: "+15550080008", address: "501 Ash Blvd, Unit 4B",    issue: "AC leak through ceiling tile in unit below",         status: "in_progress",   urgency: "same_day",  source: "intake", techIndex: 2,    ageMinutes: 230 },
  { customerName: "Sunridge Office Park",phone: "+15550090009", address: "2200 Sunridge Pkwy",       issue: "RTU diagnostic — compressor noise",                  status: "quote_pending", urgency: "scheduled", source: "manual", techIndex: 0,    ageMinutes: 350, quote: [{ name: "RTU diagnostic", price: 179, quantity: 1 }, { name: "Compressor bearing replacement", price: 490, quantity: 1 }, { name: "Labor — compressor work", price: 145, quantity: 2 }], quoteStatus: "sent" },
  { customerName: "Henderson Home",      phone: "+15550100010", address: "88 Henderson Rd",          issue: "AC not cooling — refrigerant low",                   status: "quote_pending", urgency: "same_day",  source: "call",   techIndex: 1,    ageMinutes: 410, quote: [{ name: "Leak detection", price: 129, quantity: 1 }, { name: "Refrigerant recharge (R-410A)", price: 95, quantity: 2 }, { name: "Evaporator coil inspection", price: 85, quantity: 1 }], quoteStatus: "sent" },
  { customerName: "Westview Senior Center", phone: "+15550110011", address: "400 Westview Blvd",    issue: "Common area HVAC not responding to thermostat",      status: "completed",     urgency: "scheduled", source: "intake", techIndex: 2,    ageMinutes: 480, quote: [{ name: "Thermostat replacement", price: 220, quantity: 1 }, { name: "Control board swap", price: 310, quantity: 1 }, { name: "Labor", price: 110, quantity: 1 }], quoteStatus: "accepted" },
  { customerName: "Downtown Cafe",       phone: "+15550120012", address: "15 Main Street",          issue: "Emergency — AC down during afternoon rush",          status: "completed",     urgency: "emergency", source: "call",   techIndex: 0,    ageMinutes: 590, quote: [{ name: "Emergency callout fee", price: 150, quantity: 1 }, { name: "Capacitor replacement", price: 180, quantity: 1 }, { name: "System test and commissioning", price: 75, quantity: 1 }], quoteStatus: "accepted" },
  { customerName: "Pine Glen Condos",    phone: "+15550130013", address: "55 Pine Glen Dr, Unit 8", issue: "AC not cooling — unit inaccessible",                 status: "no_access",     urgency: "scheduled", source: "manual", techIndex: 1,    ageMinutes: 290 },
  { customerName: "Hartwell Retail",     phone: "+15550140014", address: "800 Hartwell Center Dr",  issue: "HVAC inspection request — cancelled by customer",    status: "cancelled",     urgency: "scheduled", source: "call",   techIndex: null, ageMinutes: 220 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const existing = (await listAllAuthUsers()).find((u) => u.email === email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error(`Failed to refresh auth user ${email}`);
    return data.user;
  }
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error(`Failed to create auth user ${email}`);
  return data.user;
}

async function ensureUserProfile({ id, email }, companyId, role) {
  const { data: existing } = await supabase.from("users").select("id").eq("id", id).maybeSingle();
  if (existing) {
    await supabase.from("users").update({ email, company_id: companyId, role }).eq("id", id);
    return;
  }
  const { error } = await supabase.from("users").insert({ id, email, company_id: companyId, role });
  if (error) throw error;
}

async function ensureCompany() {
  const { data: existing } = await supabase.from("companies").select("id").eq("slug", COMPANY.slug).maybeSingle();
  if (existing) {
    await supabase.from("companies").update(COMPANY).eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await supabase.from("companies").insert(COMPANY).select("id").single();
  if (error || !data) throw error ?? new Error("Failed to create demo company");
  return data.id;
}

async function ensureTechnician(companyId, tech) {
  const email = `${tech.handle}@internal.swiftdispatch.app`;
  const authUser = await ensureAuthUser(email, tech.authPassword);
  await ensureUserProfile(authUser, companyId, "technician");

  const { data: existing } = await supabase.from("technicians").select("id").eq("company_id", companyId).eq("handle", tech.handle).maybeSingle();
  if (existing) {
    await supabase.from("technicians").update({ name: tech.name, phone: tech.phone, auth_user_id: authUser.id, availability_status: "available" }).eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await supabase.from("technicians").insert({ company_id: companyId, name: tech.name, phone: tech.phone, handle: tech.handle, auth_user_id: authUser.id, availability_status: "available" }).select("id").single();
  if (error || !data) throw error ?? new Error(`Failed to create technician ${tech.name}`);
  return data.id;
}

async function ensureTemplate(companyId) {
  const { data: existing } = await supabase.from("quote_templates").select("id").eq("company_id", companyId).eq("name", TEMPLATE.name).maybeSingle();
  if (existing) {
    await supabase.from("quote_templates").update(TEMPLATE).eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await supabase.from("quote_templates").insert({ company_id: companyId, ...TEMPLATE }).select("id").single();
  if (error || !data) throw error ?? new Error("Failed to create template");
  return data.id;
}

async function seedJobs(companyId, techIds) {
  // Wipe existing data before re-seeding
  await supabase.from("technicians").update({ current_job_id: null, availability_status: "available" }).eq("company_id", companyId);

  const { data: existingJobs } = await supabase.from("jobs").select("id").eq("company_id", companyId);
  if (existingJobs && existingJobs.length > 0) {
    const jobIds = existingJobs.map((j) => j.id);
    await supabase.from("sms_outbox").delete().eq("company_id", companyId);
    await supabase.from("status_events").delete().in("job_id", jobIds);
    const { data: existingQuotes } = await supabase.from("quotes").select("id").in("job_id", jobIds);
    if (existingQuotes && existingQuotes.length > 0) {
      const quoteIds = existingQuotes.map((q) => q.id);
      await supabase.from("quote_line_items").delete().in("quote_id", quoteIds);
      await supabase.from("quotes").delete().in("id", quoteIds);
    }
    await supabase.from("jobs").delete().eq("company_id", companyId);
  }

  const now = Date.now();
  let seeded = 0;

  for (const demoJob of DEMO_JOBS) {
    const createdAt = new Date(now - demoJob.ageMinutes * 60_000);
    const assignedAt = new Date(createdAt.getTime() + 8 * 60_000);
    const enRouteAt  = new Date(createdAt.getTime() + 18 * 60_000);
    const arrivedAt  = new Date(createdAt.getTime() + 40 * 60_000);
    const quoteAt    = new Date(createdAt.getTime() + 55 * 60_000);
    const quoteSentAt= new Date(createdAt.getTime() + 58 * 60_000);
    const completedAt= new Date(createdAt.getTime() + 90 * 60_000);

    const isAssigned = !["new", "cancelled"].includes(demoJob.status);
    const techId = demoJob.techIndex !== null ? (techIds[demoJob.techIndex] ?? null) : null;

    const jobPayload = {
      customer_name: demoJob.customerName,
      phone: demoJob.phone,
      address: demoJob.address,
      issue: demoJob.issue,
      status: demoJob.status,
      urgency: demoJob.urgency,
      source: demoJob.source,
      sms_consent_type: demoJob.source === "intake" ? "intake_form" : "verbal_logged",
      technician_id: isAssigned ? techId : null,
      company_id: companyId,
      created_at: createdAt.toISOString(),
      is_demo: true,
      ...(isAssigned && { assigned_at: assignedAt.toISOString() }),
      ...(["en_route", "in_progress", "quote_pending", "completed"].includes(demoJob.status) && { en_route_at: enRouteAt.toISOString() }),
      ...(["in_progress", "quote_pending", "completed"].includes(demoJob.status) && { arrived_at: arrivedAt.toISOString() }),
      ...(demoJob.status === "completed" && { completed_at: completedAt.toISOString() }),
      ...(demoJob.status === "cancelled" && { cancelled_at: new Date(createdAt.getTime() + 20 * 60_000).toISOString() }),
    };

    const { data: job, error: jobError } = await supabase.from("jobs").insert(jobPayload).select("id").single();
    if (jobError || !job) { console.error(`Failed to insert ${demoJob.customerName}:`, jobError?.message); continue; }

    const events = [{ from: null, to: "new", offsetMs: 0, role: demoJob.source === "intake" ? "customer" : "dispatcher" }];
    if (isAssigned) events.push({ from: "new", to: "assigned", offsetMs: 8 * 60_000, role: "dispatcher" });
    if (["en_route", "in_progress", "quote_pending", "completed"].includes(demoJob.status)) events.push({ from: "assigned", to: "en_route", offsetMs: 18 * 60_000, role: "technician" });
    if (["in_progress", "quote_pending", "completed"].includes(demoJob.status)) events.push({ from: "en_route", to: "in_progress", offsetMs: 40 * 60_000, role: "technician" });
    if (["quote_pending", "completed"].includes(demoJob.status)) events.push({ from: "in_progress", to: "quote_pending", offsetMs: 60 * 60_000, role: "technician" });
    if (demoJob.status === "completed") events.push({ from: "quote_pending", to: "completed", offsetMs: 90 * 60_000, role: "customer" });
    if (demoJob.status === "no_access") events.push({ from: "assigned", to: "no_access", offsetMs: 30 * 60_000, role: "technician" });
    if (demoJob.status === "cancelled") events.push({ from: "new", to: "cancelled", offsetMs: 20 * 60_000, role: "dispatcher" });

    await supabase.from("status_events").insert(events.map((e) => ({ job_id: job.id, from_status: e.from, to_status: e.to, actor_role: e.role, created_at: new Date(createdAt.getTime() + e.offsetMs).toISOString() })));

    if (demoJob.quote && demoJob.quoteStatus) {
      const total = demoJob.quote.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const { data: quote } = await supabase.from("quotes").insert({ job_id: job.id, total, total_amount: total, status: demoJob.quoteStatus, created_at: quoteAt.toISOString(), quote_sent_at: quoteSentAt.toISOString(), accepted_at: demoJob.quoteStatus === "accepted" ? new Date(quoteSentAt.getTime() + 18 * 60_000).toISOString() : null, is_demo: true }).select("id").single();
      if (quote) await supabase.from("quote_line_items").insert(demoJob.quote.map((item) => ({ quote_id: quote.id, name: item.name, price: item.price, quantity: item.quantity })));
    }

    seeded++;
  }

  return seeded;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Setting up demo tenant…");
  const companyId = await ensureCompany();
  console.log(`  Company: ${companyId}`);

  const demoAuthUser = await ensureAuthUser(DEMO_USER.email, DEMO_USER.password);
  await ensureUserProfile(demoAuthUser, companyId, DEMO_USER.role);
  console.log(`  Demo user: ${DEMO_USER.email} / ${DEMO_USER.password}`);

  const techIds = [];
  for (const tech of TECHNICIANS) {
    techIds.push(await ensureTechnician(companyId, tech));
  }
  console.log(`  Technicians: ${TECHNICIANS.map((t) => t.name).join(", ")}`);

  await ensureTemplate(companyId);
  console.log(`  Template: ${TEMPLATE.name}`);

  const seeded = await seedJobs(companyId, techIds);
  console.log(`  Jobs seeded: ${seeded}`);

  console.log("\nDemo tenant ready.");
  console.log(`  Login: ${DEMO_USER.email} / ${DEMO_USER.password}`);
  console.log(`  Daily reset: POST /api/internal/reset-demo (05:00 UTC = 00:00 EST)`);
  console.log(`  Vercel cron: set CRON_SECRET env var — already configured in vercel.json`);
}

main().catch((err) => { console.error(err); process.exit(1); });
