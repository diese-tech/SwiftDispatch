/**
 * Minimal authenticated-session helper for e2e tests that need to call
 * dispatcher/admin-only API routes over real HTTP (cookie-based Supabase
 * Auth), without pulling in the load-testing scripts (which bundle
 * autocannon and other unrelated tooling).
 */
import { createServerClient } from "@supabase/ssr";

export type DispatcherSession = {
  getCookieHeader(): string;
};

export async function createDispatcherSession(options: {
  email: string;
  password: string;
  supabaseUrl: string;
  anonKey: string;
}): Promise<DispatcherSession> {
  const jar: { name: string; value: string }[] = [];

  const client = createServerClient(options.supabaseUrl, options.anonKey, {
    cookies: {
      getAll() {
        return jar.slice();
      },
      setAll(items) {
        for (const item of items) {
          const next = { name: item.name, value: item.value };
          const index = jar.findIndex((cookie) => cookie.name === item.name);
          if (index >= 0) jar[index] = next;
          else jar.push(next);
        }
      },
    },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: options.email,
    password: options.password,
  });

  if (error || !data.user) {
    throw error ?? new Error(`Failed to sign in as ${options.email}`);
  }

  return {
    getCookieHeader() {
      return jar.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    },
  };
}

export async function fetchAsDispatcher(url: string, session: DispatcherSession, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set("Cookie", session.getCookieHeader());
  return fetch(url, { ...init, headers });
}
