import {
  loadEnvFile,
  envNumber,
  requireEnv,
  buildLoadIdentity,
  postJson,
  runAutocannon,
} from "./load-helpers.mjs";

loadEnvFile();

const baseUrl = requireEnv("LOAD_BASE_URL", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const companySlugs = requireEnv(
  "LOAD_MULTI_COMPANY_SLUGS",
  "northwind-comfort-live-qa,load-fleet-hvac-1,load-fleet-hvac-2,load-fleet-hvac-3"
).split(",").map((slug) => slug.trim()).filter(Boolean);

const runId = process.env.LOAD_RUN_ID ?? `${Date.now()}`;
const warmupConnections = envNumber("LOAD_WARMUP_CONNECTIONS", 3);
const warmupDuration = envNumber("LOAD_WARMUP_DURATION_SECONDS", 10);
const intakeConnections = envNumber("LOAD_INTAKE_CONNECTIONS", 20);
const intakeDuration = envNumber("LOAD_INTAKE_DURATION_SECONDS", 30);
const spikeConnections = envNumber("LOAD_SPIKE_CONNECTIONS", 50);
const spikeDuration = envNumber("LOAD_SPIKE_DURATION_SECONDS", 15);
const statusConnections = envNumber("LOAD_STATUS_CONNECTIONS", 12);
const statusDuration = envNumber("LOAD_STATUS_DURATION_SECONDS", 20);

const intakeUrl = `${baseUrl}/api/intake`;

function buildCompanyBody(companySlug, index) {
  const identity = buildLoadIdentity(`${runId}-${companySlug}-${index}`);
  return {
    ...identity,
    urgency: "same_day",
    smsConsent: true,
    companySlug,
  };
}

async function preflightCompany(companySlug, index) {
  const { response, data } = await postJson(intakeUrl, buildCompanyBody(companySlug, index));
  if (!response.ok || !data?.statusToken) {
    throw new Error(`Intake preflight failed for ${companySlug}: ${response.status} ${JSON.stringify(data)}`);
  }

  return {
    companySlug,
    body: JSON.stringify(buildCompanyBody(companySlug, index)),
    statusUrl: `${baseUrl}/api/intake/status?token=${encodeURIComponent(data.statusToken)}`,
    jobRef: data.jobRef,
  };
}

function summarizePhase(label, results) {
  const totals = results.reduce((acc, result) => {
    acc.requestsAverage += result.requests.average ?? 0;
    acc.errors += result.errors ?? 0;
    acc.timeouts += result.timeouts ?? 0;
    acc.non2xx += result.non2xx ?? 0;
    acc.latencyAverage += result.latency.average ?? 0;
    acc.latencyP99 = Math.max(acc.latencyP99, result.latency.p99 ?? 0);
    return acc;
  }, {
    requestsAverage: 0,
    errors: 0,
    timeouts: 0,
    non2xx: 0,
    latencyAverage: 0,
    latencyP99: 0,
  });

  console.log(`\n[load] ${label} totals`);
  console.table({
    companies: results.length,
    requestsAverage: totals.requestsAverage,
    errors: totals.errors,
    timeouts: totals.timeouts,
    non2xx: totals.non2xx,
    latencyAverage: results.length ? totals.latencyAverage / results.length : 0,
    latencyP99Max: totals.latencyP99,
  });
}

async function runPhase(label, preflights, optionsBuilder) {
  const results = await Promise.all(
    preflights.map((preflight, index) => runAutocannon(`${label} :: ${preflight.companySlug}`, optionsBuilder(preflight, index)))
  );
  summarizePhase(label, results);
}

console.log("[load] multi-company public configuration");
console.table({
  baseUrl,
  runId,
  companies: companySlugs.length,
  companySlugs: companySlugs.join(", "),
  warmupConnectionsPerCompany: warmupConnections,
  intakeConnectionsPerCompany: intakeConnections,
  spikeConnectionsPerCompany: spikeConnections,
  statusConnectionsPerCompany: statusConnections,
});

if (process.env.DISABLE_OUTBOUND_SMS !== "true") {
  console.warn("[load] DISABLE_OUTBOUND_SMS is not true in this shell. Ensure the target server has SMS disabled before hammering intake.");
}

const preflights = await Promise.all(companySlugs.map((slug, index) => preflightCompany(slug, index)));
console.log("[load] multi-company preflight jobs");
console.table(preflights.map(({ companySlug, jobRef }) => ({ companySlug, jobRef })));

await runPhase("fleet intake warmup", preflights, (preflight) => ({
  url: intakeUrl,
  method: "POST",
  connections: warmupConnections,
  duration: warmupDuration,
  headers: { "Content-Type": "application/json" },
  body: preflight.body,
}));

await runPhase("fleet intake sustained", preflights, (preflight) => ({
  url: intakeUrl,
  method: "POST",
  connections: intakeConnections,
  duration: intakeDuration,
  headers: { "Content-Type": "application/json" },
  body: preflight.body,
}));

await runPhase("fleet intake spike", preflights, (preflight) => ({
  url: intakeUrl,
  method: "POST",
  connections: spikeConnections,
  duration: spikeDuration,
  headers: { "Content-Type": "application/json" },
  body: preflight.body,
}));

await runPhase("fleet intake status reads", preflights, (preflight) => ({
  url: preflight.statusUrl,
  method: "GET",
  connections: statusConnections,
  duration: statusDuration,
}));

console.log(`[load] completed multi-company public run ${runId}`);
