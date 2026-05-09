import { loadEnvFile, envNumber, requireEnv, buildLoadIdentity, postJson, runAutocannon } from "./load-helpers.mjs";

loadEnvFile();

const baseUrl = requireEnv("LOAD_BASE_URL", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const companySlug = requireEnv("LOAD_COMPANY_SLUG", "northwind-comfort-live-qa");
const runId = process.env.LOAD_RUN_ID ?? `${Date.now()}`;

const warmupConnections = envNumber("LOAD_WARMUP_CONNECTIONS", 5);
const warmupDuration = envNumber("LOAD_WARMUP_DURATION_SECONDS", 10);
const intakeConnections = envNumber("LOAD_INTAKE_CONNECTIONS", 25);
const intakeDuration = envNumber("LOAD_INTAKE_DURATION_SECONDS", 30);
const spikeConnections = envNumber("LOAD_SPIKE_CONNECTIONS", 75);
const spikeDuration = envNumber("LOAD_SPIKE_DURATION_SECONDS", 15);
const statusConnections = envNumber("LOAD_STATUS_CONNECTIONS", 40);
const statusDuration = envNumber("LOAD_STATUS_DURATION_SECONDS", 20);

const intakeUrl = `${baseUrl}/api/intake`;
const identity = buildLoadIdentity(runId);
const intakeBody = JSON.stringify({
  ...identity,
  urgency: "same_day",
  smsConsent: true,
  companySlug,
});

console.log("[load] public flow configuration");
console.table({
  baseUrl,
  companySlug,
  runId,
  warmupConnections,
  intakeConnections,
  spikeConnections,
  statusConnections,
});

if (process.env.DISABLE_OUTBOUND_SMS !== "true") {
  console.warn("[load] DISABLE_OUTBOUND_SMS is not true in this shell. Ensure the target server has SMS disabled before hammering intake.");
}

const preflight = await postJson(intakeUrl, JSON.parse(intakeBody));
if (!preflight.response.ok || !preflight.data?.statusToken) {
  throw new Error(`Intake preflight failed: ${preflight.response.status} ${JSON.stringify(preflight.data)}`);
}

const statusUrl = `${baseUrl}/api/intake/status?token=${encodeURIComponent(preflight.data.statusToken)}`;
console.log(`[load] preflight created job ${preflight.data.jobRef}`);

await runAutocannon("intake warmup", {
  url: intakeUrl,
  method: "POST",
  connections: warmupConnections,
  duration: warmupDuration,
  headers: {
    "Content-Type": "application/json",
  },
  body: intakeBody,
});

await runAutocannon("intake sustained", {
  url: intakeUrl,
  method: "POST",
  connections: intakeConnections,
  duration: intakeDuration,
  headers: {
    "Content-Type": "application/json",
  },
  body: intakeBody,
});

await runAutocannon("intake spike", {
  url: intakeUrl,
  method: "POST",
  connections: spikeConnections,
  duration: spikeDuration,
  headers: {
    "Content-Type": "application/json",
  },
  body: intakeBody,
});

await runAutocannon("intake status reads", {
  url: statusUrl,
  method: "GET",
  connections: statusConnections,
  duration: statusDuration,
});

console.log(`[load] completed run ${runId}`);
console.log("[load] note: this creates real intake jobs for the target company. Use a QA tenant for repeated runs.");
