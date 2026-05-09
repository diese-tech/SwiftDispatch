import { loadEnvFile, requireEnv } from "./load-helpers.mjs";

loadEnvFile();

const baseUrl = requireEnv(
  "LOAD_BASE_URL",
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const workerSecret = requireEnv("INTERNAL_WORKER_SECRET");
const intervalMs = Number.parseInt(process.env.SMS_WORKER_INTERVAL_MS ?? "5000", 10);
const batchSize = Number.parseInt(process.env.SMS_WORKER_BATCH_SIZE ?? "25", 10);

async function tick() {
  const response = await fetch(
    `${baseUrl}/api/internal/sms-outbox?limit=${encodeURIComponent(String(batchSize))}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workerSecret}`,
      },
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`SMS worker failed: ${response.status} ${JSON.stringify(data)}`);
  }

  const stamp = new Date().toISOString();
  console.log(`[sms-worker] ${stamp}`, data);
}

console.log("[sms-worker] starting");
console.table({ baseUrl, intervalMs, batchSize });

while (true) {
  try {
    await tick();
  } catch (error) {
    console.error("[sms-worker] tick failed", error);
  }

  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
