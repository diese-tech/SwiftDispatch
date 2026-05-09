import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile, envNumber, requireEnv } from "./load-helpers.mjs";

loadEnvFile();

const baseUrl = requireEnv("LOAD_BASE_URL", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const companySlugs = requireEnv(
  "LOAD_MULTI_COMPANY_SLUGS",
  "northwind-comfort-live-qa,load-fleet-hvac-1,load-fleet-hvac-2,load-fleet-hvac-3"
).split(",").map((slug) => slug.trim()).filter(Boolean);
const techSecret = requireEnv("TECH_TOKEN_SECRET");
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const durationSeconds = envNumber("LOAD_TECH_DURATION_SECONDS", 30);
const concurrencyPerCompany = envNumber("LOAD_TECH_CONCURRENCY", 30);
const seedJobsPerCompany = envNumber("LOAD_TECH_JOB_COUNT", 100);

const supabase = createClient(supabaseUrl, serviceRoleKey);

function techToken(jobId, action = "en_route") {
  return jwt.sign({ jobId, action }, techSecret, { expiresIn: "24h" });
}

async function getCompany(slug) {
  const { data, error } = await supabase
    .from("companies")
    .select("id,name")
    .eq("slug", slug)
    .single();

  if (error || !data) throw new Error(`Company not found for slug ${slug}`);
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

async function seedAssignedJobs(companyId, technicianId, count, companySlug) {
  const ids = [];

  for (let index = 0; index < count; index += 1) {
    const createdAt = new Date(Date.now() - index * 1000).toISOString();
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        company_id: companyId,
        customer_name: `LOADTEST TECH ${companySlug} ${Date.now()}-${index}`,
        phone: `556${String(companyId.length).slice(0, 1)}${String(index).padStart(6, "0")}`.slice(0, 10),
        address: `Tech Action Load ${companySlug} ${index}`,
        issue: "Synthetic multi-company tech action load test",
        problem_description: "Synthetic multi-company tech action load test",
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
      throw new Error(error?.message ?? `Failed to seed tech action load job for ${companySlug}`);
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

const companyContexts = [];
for (const slug of companySlugs) {
  const company = await getCompany(slug);
  const technician = await getTechnician(company.id);
  const jobIds = await seedAssignedJobs(company.id, technician.id, seedJobsPerCompany, slug);
  companyContexts.push({
    slug,
    company,
    technician,
    tokens: jobIds.map((jobId) => techToken(jobId)),
  });
}

console.log("[load] multi-company tech action configuration");
console.table(companyContexts.map((ctx) => ({
  companySlug: ctx.slug,
  companyId: ctx.company.id,
  technician: ctx.technician.name,
  seedJobsPerCompany,
  concurrencyPerCompany,
  durationSeconds,
})));

const stats = {
  count: 0,
  errors: 0,
  latencies: [],
  statusCodes: {},
};

const deadline = Date.now() + durationSeconds * 1000;
await Promise.all(
  companyContexts.flatMap((ctx) =>
    Array.from({ length: concurrencyPerCompany }, () => runWorker(ctx.tokens, deadline, stats))
  )
);

const averageLatency = stats.latencies.length
  ? stats.latencies.reduce((sum, value) => sum + value, 0) / stats.latencies.length
  : 0;

console.log("\n[load] multi-company tech action summary");
console.table({
  companies: companyContexts.length,
  requests: stats.count,
  errors: stats.errors,
  rps: durationSeconds ? (stats.count / durationSeconds).toFixed(2) : "0.00",
  latencyAvgMs: averageLatency.toFixed(2),
  latencyP95Ms: percentile(stats.latencies, 95).toFixed(2),
  latencyP99Ms: percentile(stats.latencies, 99).toFixed(2),
});

console.log("[load] multi-company tech action status codes");
console.table(stats.statusCodes);
