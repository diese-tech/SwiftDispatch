import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile, envNumber, requireEnv } from "./load-helpers.mjs";

loadEnvFile();

const baseUrl = requireEnv("LOAD_BASE_URL", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const companySlug = requireEnv("LOAD_COMPANY_SLUG", "northwind-comfort-live-qa");
const techSecret = requireEnv("TECH_TOKEN_SECRET");
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const durationSeconds = envNumber("LOAD_TECH_DURATION_SECONDS", 30);
const concurrency = envNumber("LOAD_TECH_CONCURRENCY", 25);
const seedJobs = envNumber("LOAD_TECH_JOB_COUNT", 75);

const supabase = createClient(supabaseUrl, serviceRoleKey);

function techToken(jobId, action = "en_route") {
  return jwt.sign({ jobId, action }, techSecret, { expiresIn: "24h" });
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

  if (error || !data) throw new Error("At least one technician is required for tech-action load tests");
  return data;
}

async function seedAssignedJobs(companyId, technicianId, count) {
  const ids = [];

  for (let index = 0; index < count; index += 1) {
    const createdAt = new Date(Date.now() - index * 1000).toISOString();
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        company_id: companyId,
        customer_name: `LOADTEST TECH ${Date.now()}-${index}`,
        phone: `5558${String(index).padStart(6, "0")}`,
        address: `Tech Action Load ${index}`,
        issue: "Synthetic tech action load test",
        problem_description: "Synthetic tech action load test",
        status: "assigned",
        source: "manual",
        sms_consent_type: "none",
        urgency: "scheduled",
        technician_id: technicianId,
        technician_assigned_at: createdAt,
        created_at: createdAt,
        is_demo: true,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to seed tech action load job");
    }

    ids.push(data.id);
  }

  return ids;
}

async function runWorker(tokens, deadline, stats) {
  let index = 0;
  while (Date.now() < deadline) {
    const token = tokens[index % tokens.length];
    index += 1;
    const started = performance.now();

    try {
      const response = await fetch(`${baseUrl}/api/tech-action?token=${encodeURIComponent(token)}`);
      const elapsed = performance.now() - started;
      stats.count += 1;
      stats.latencies.push(elapsed);
      stats.statusCodes[response.status] = (stats.statusCodes[response.status] ?? 0) + 1;
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
const jobIds = await seedAssignedJobs(company.id, technician.id, seedJobs);
const tokens = jobIds.map((jobId) => techToken(jobId));

console.log("[load] tech action configuration");
console.table({
  baseUrl,
  companySlug,
  companyId: company.id,
  technician: technician.name,
  seedJobs,
  concurrency,
  durationSeconds,
});

const stats = {
  count: 0,
  errors: 0,
  latencies: [],
  statusCodes: {},
};

const deadline = Date.now() + durationSeconds * 1000;
await Promise.all(Array.from({ length: concurrency }, () => runWorker(tokens, deadline, stats)));

const averageLatency = stats.latencies.length
  ? stats.latencies.reduce((sum, value) => sum + value, 0) / stats.latencies.length
  : 0;

console.log("\n[load] tech action summary");
console.table({
  requests: stats.count,
  errors: stats.errors,
  rps: durationSeconds ? (stats.count / durationSeconds).toFixed(2) : "0.00",
  latencyAvgMs: averageLatency.toFixed(2),
  latencyP95Ms: percentile(stats.latencies, 95).toFixed(2),
  latencyP99Ms: percentile(stats.latencies, 99).toFixed(2),
});

console.log("[load] tech action status codes");
console.table(stats.statusCodes);
console.log("[load] seeded jobs are flagged is_demo=true to reduce operational noise.");
