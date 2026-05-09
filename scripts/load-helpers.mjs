import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import autocannon from "autocannon";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

export function loadEnvFile(relativePath = ".env.local") {
  const filePath = path.join(repoRoot, relativePath);
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

export function envNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function randomDigits(length) {
  let out = "";
  while (out.length < length) {
    out += String(Math.floor(Math.random() * 10));
  }
  return out.slice(0, length);
}

export function buildLoadIdentity(runId) {
  const suffix = randomDigits(7);
  return {
    runId,
    name: `Load Test ${runId}`,
    phone: `555${suffix}`,
    address: `99 Load Test Ave ${runId}`,
    problemDescription: `Synthetic load test traffic ${runId}`,
  };
}

export async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export async function createSessionCookieJar({ email, password, supabaseUrl, anonKey }) {
  const { createServerClient } = await import("@supabase/ssr");
  const jar = [];

  const cookies = {
    getAll() {
      return jar.slice();
    },
    setAll(items) {
      for (const item of items) {
        const next = { name: item.name, value: item.value };
        const index = jar.findIndex((cookie) => cookie.name === item.name);
        if (index >= 0) {
          jar[index] = next;
        } else {
          jar.push(next);
        }
      }
    },
  };

  const client = createServerClient(supabaseUrl, anonKey, { cookies });
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    throw error ?? new Error(`Failed to sign in ${email}`);
  }

  return {
    email,
    getCookieHeader() {
      return jar.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    },
  };
}

export async function fetchWithCookies(url, session, init = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set("Cookie", session.getCookieHeader());
  return fetch(url, { ...init, headers, redirect: init.redirect ?? "manual" });
}

export function runAutocannon(label, options) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(options, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      const summary = {
        label,
        url: options.url,
        method: options.method ?? "GET",
        connections: options.connections ?? 1,
        duration: options.duration ?? 10,
        requestsAverage: result.requests.average,
        requestsP99: result.requests.p99,
        latencyAverage: result.latency.average,
        latencyP95: result.latency.p95,
        latencyP99: result.latency.p99,
        errors: result.errors,
        timeouts: result.timeouts,
        non2xx: result.non2xx,
      };

      console.log(`\n[load] ${label}`);
      console.table(summary);
      resolve(result);
    });

    autocannon.track(instance, {
      renderProgressBar: true,
      renderResultsTable: false,
      renderLatencyTable: false,
      renderProgressBarAtBottom: true,
    });
  });
}
