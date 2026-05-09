import { createClient } from "@supabase/supabase-js";
import {
  createSessionCookieJar,
  envNumber,
  fetchWithCookies,
  loadEnvFile,
  requireEnv,
} from "./load-helpers.mjs";

loadEnvFile();

const baseUrl = requireEnv("LOAD_BASE_URL", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const companySlug = requireEnv("LOAD_COMPANY_SLUG", "northwind-comfort-live-qa");
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const durationSeconds = envNumber("LOAD_OFFICE_DURATION_SECONDS", 30);
const concurrency = envNumber("LOAD_OFFICE_CONCURRENCY", 8);

const supabase = createClient(supabaseUrl, serviceRoleKey);

function officeEmails(slug) {
  if (slug === "northwind-comfort-live-qa") {
    return {
      dispatcher: "dispatch@northwind-live-qa.com",
      admin: "admin@northwind-live-qa.com",
    };
  }

  const fleetMatch = slug.match(/^load-fleet-hvac-(\d+)$/);
  if (fleetMatch) {
    return {
      dispatcher: `dispatch+fleet${fleetMatch[1]}@northwind-live-qa.com`,
      admin: `admin+fleet${fleetMatch[1]}@northwind-live-qa.com`,
    };
  }

  throw new Error(`No office user mapping found for slug ${slug}`);
}

async function getCompany() {
  const { data, error } = await supabase
    .from("companies")
    .select("id,name")
    .eq("slug", companySlug)
    .single();

  if (error || !data) throw new Error(`Company not found for slug ${companySlug}`);
  return data;
}

async function getTechnician(companyId) {
  const { data, error } = await supabase
    .from("technicians")
    .select("id,name")
    .eq("company_id", companyId)
    .limit(1)
    .single();

  if (error || !data) throw new Error(`No technician found for company ${companyId}`);
  return data;
}

function statusBucket(stats, key) {
  stats.statusCodes[key] = (stats.statusCodes[key] ?? 0) + 1;
}

async function parseJsonSafe(response) {
  return response.json().catch(() => ({}));
}

async function patchJob(jobId, body, session, stats, label) {
  const started = performance.now();
  const response = await fetchWithCookies(`${baseUrl}/api/jobs/${jobId}`, session, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  stats.latencies.push(performance.now() - started);
  statusBucket(stats, `${label}:${response.status}`);
  return response;
}

async function runOfficeCycle(context, stats, workerId, cycle) {
  const dispatchStarted = performance.now();
  const dispatchResponse = await fetchWithCookies(`${baseUrl}/dispatch`, context.dispatcherSession);
  stats.latencies.push(performance.now() - dispatchStarted);
  statusBucket(stats, `dispatch-page:${dispatchResponse.status}`);

  const adminStarted = performance.now();
  const adminResponse = await fetchWithCookies(`${baseUrl}/admin`, context.adminSession);
  stats.latencies.push(performance.now() - adminStarted);
  statusBucket(stats, `admin-page:${adminResponse.status}`);

  const createStarted = performance.now();
  const createResponse = await fetchWithCookies(`${baseUrl}/api/jobs`, context.dispatcherSession, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer_name: `Office Load ${workerId}-${cycle}`,
      phone: `557${String(workerId).padStart(2, "0")}${String(cycle).padStart(5, "0")}`.slice(0, 10),
      address: `Office Load ${companySlug} ${workerId}-${cycle}`,
      issue: "Synthetic dispatcher/admin load test",
      problem_description: "Synthetic dispatcher/admin load test",
      urgency: "scheduled",
      source: "manual",
      sms_consent_type: "none",
    }),
  });
  stats.latencies.push(performance.now() - createStarted);
  statusBucket(stats, `create-job:${createResponse.status}`);

  if (!createResponse.ok) return;

  const createData = await parseJsonSafe(createResponse);
  const jobId = createData?.job?.id;
  if (!jobId) return;

  await patchJob(jobId, { technician_id: context.technician.id, note: "Assigned under office load" }, context.adminSession, stats, "assign");
  await patchJob(jobId, { status: "en_route", note: "Moved to en_route under office load" }, context.dispatcherSession, stats, "en-route");
  await patchJob(jobId, { status: "in_progress", note: "Moved to in_progress under office load" }, context.dispatcherSession, stats, "in-progress");
  await patchJob(jobId, { status: "quote_pending", note: "Moved to quote_pending under office load" }, context.adminSession, stats, "quote-pending");
  await patchJob(jobId, { status: "completed", note: "Moved to completed under office load" }, context.adminSession, stats, "completed");
}

async function worker(context, stats, workerId, deadline) {
  let cycle = 0;
  while (Date.now() < deadline) {
    cycle += 1;
    try {
      await runOfficeCycle(context, stats, workerId, cycle);
      stats.cycles += 1;
    } catch {
      stats.errors += 1;
    }
  }
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

const company = await getCompany();
const technician = await getTechnician(company.id);
const emails = officeEmails(companySlug);
const dispatcherSession = await createSessionCookieJar({
  email: emails.dispatcher,
  password: "serpentine1",
  supabaseUrl,
  anonKey,
});
const adminSession = await createSessionCookieJar({
  email: emails.admin,
  password: "serpentine1",
  supabaseUrl,
  anonKey,
});

console.log("[load] office action configuration");
console.table({
  baseUrl,
  companySlug,
  companyId: company.id,
  technician: technician.name,
  concurrency,
  durationSeconds,
});

const stats = {
  cycles: 0,
  errors: 0,
  latencies: [],
  statusCodes: {},
};

const deadline = Date.now() + durationSeconds * 1000;
await Promise.all(Array.from({ length: concurrency }, (_, index) => worker({
  dispatcherSession,
  adminSession,
  technician,
}, stats, index + 1, deadline)));

const averageLatency = stats.latencies.length
  ? stats.latencies.reduce((sum, value) => sum + value, 0) / stats.latencies.length
  : 0;

console.log("\n[load] office action summary");
console.table({
  cycles: stats.cycles,
  errors: stats.errors,
  requests: stats.latencies.length,
  rps: durationSeconds ? (stats.latencies.length / durationSeconds).toFixed(2) : "0.00",
  latencyAvgMs: averageLatency.toFixed(2),
  latencyP95Ms: percentile(stats.latencies, 95).toFixed(2),
  latencyP99Ms: percentile(stats.latencies, 99).toFixed(2),
});

console.log("[load] office action status codes");
console.table(stats.statusCodes);
