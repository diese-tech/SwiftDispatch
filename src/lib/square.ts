import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import jwt from "jsonwebtoken";

const SQUARE_VERSION = "2026-01-22";
const SQUARE_SCOPES = ["MERCHANT_PROFILE_READ", "ORDERS_WRITE", "INVOICES_WRITE"] as const;

type SquareEnvironment = "sandbox" | "production";

type SquareOAuthState = {
  companyId: string;
  userId: string;
  returnTo: string;
};

type SquareTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at?: string;
  merchant_id?: string;
  short_lived?: boolean;
  scopes?: string[];
};

type SquareMerchant = {
  id: string;
  business_name?: string;
  main_location_id?: string;
};

type SquareLocation = {
  id: string;
  name?: string;
  business_name?: string;
  status?: string;
};

export type SquareConnectionPublic = {
  connected: boolean;
  environment: SquareEnvironment | null;
  merchantId: string | null;
  merchantName: string | null;
  locationId: string | null;
  locationName: string | null;
  connectedAt: string | null;
  oauthConfigured: boolean;
};

type SquareConnectionStored = {
  connected: boolean;
  environment: SquareEnvironment;
  merchantId: string | null;
  merchantName: string | null;
  locationId: string | null;
  locationName: string | null;
  connectedAt: string;
  scopes: string[];
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  expiresAt: string | null;
};

function getSquareEnvironment(): SquareEnvironment {
  return process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
}

function getOAuthBaseUrl() {
  return getSquareEnvironment() === "production"
    ? "https://connect.squareup.com/oauth2"
    : "https://connect.squareupsandbox.com/oauth2";
}

function getApiBaseUrl() {
  return getSquareEnvironment() === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getSquareRedirectUri() {
  const configured = process.env.SQUARE_REDIRECT_URI?.trim();
  if (configured) return configured;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!appUrl) throw new Error("Missing required environment variable: NEXT_PUBLIC_APP_URL");
  return `${appUrl}/api/admin/square/callback`;
}

function getEncryptionKey() {
  return createHash("sha256").update(requireEnv("SQUARE_TOKEN_ENCRYPTION_KEY")).digest();
}

function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string) {
  const [iv, tag, encrypted] = payload.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Invalid encrypted secret payload");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function hasSquareOAuthConfig() {
  return Boolean(
    process.env.SQUARE_APPLICATION_ID &&
      process.env.SQUARE_APPLICATION_SECRET &&
      process.env.SQUARE_STATE_SECRET &&
      process.env.SQUARE_TOKEN_ENCRYPTION_KEY &&
      (process.env.SQUARE_REDIRECT_URI || process.env.NEXT_PUBLIC_APP_URL),
  );
}

export function buildSquareAuthorizeUrl(statePayload: SquareOAuthState) {
  const state = jwt.sign(statePayload, requireEnv("SQUARE_STATE_SECRET"), {
    expiresIn: "10m",
  });

  const params = new URLSearchParams({
    client_id: requireEnv("SQUARE_APPLICATION_ID"),
    response_type: "code",
    scope: SQUARE_SCOPES.join(" "),
    session: "false",
    state,
    redirect_uri: getSquareRedirectUri(),
  });

  return `${getOAuthBaseUrl()}/authorize?${params.toString()}`;
}

export function verifySquareOAuthState(state: string) {
  return jwt.verify(state, requireEnv("SQUARE_STATE_SECRET")) as SquareOAuthState;
}

async function squareFetch<T>(path: string, init: RequestInit & { accessToken?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("Square-Version", SQUARE_VERSION);
  headers.set("Content-Type", "application/json");
  if (init.accessToken) headers.set("Authorization", `Bearer ${init.accessToken}`);

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as T & { errors?: Array<{ detail?: string; code?: string }> };
  if (!response.ok) {
    const message = data.errors?.map((error) => error.detail || error.code).filter(Boolean).join("; ");
    throw new Error(message || `Square request failed: ${response.status}`);
  }

  return data;
}

export async function exchangeSquareAuthorizationCode(code: string) {
  const response = await fetch(`${getOAuthBaseUrl()}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
    body: JSON.stringify({
      client_id: requireEnv("SQUARE_APPLICATION_ID"),
      client_secret: requireEnv("SQUARE_APPLICATION_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: getSquareRedirectUri(),
    }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as SquareTokenResponse & {
    errors?: Array<{ detail?: string; code?: string }>;
  };

  if (!response.ok || !data.access_token || !data.refresh_token) {
    const message = data.errors?.map((error) => error.detail || error.code).filter(Boolean).join("; ");
    throw new Error(message || "Square token exchange failed");
  }

  return data;
}

export async function fetchSquareMerchantContext(accessToken: string) {
  const merchantsResponse = await squareFetch<{ merchant?: SquareMerchant[] }>("/v2/merchants", {
    method: "GET",
    accessToken,
  });
  const locationsResponse = await squareFetch<{ locations?: SquareLocation[] }>("/v2/locations", {
    method: "GET",
    accessToken,
  });

  const merchant = merchantsResponse.merchant?.[0] ?? null;
  const locations = locationsResponse.locations ?? [];
  const activeLocations = locations.filter((location) => location.status === "ACTIVE");
  const selectedLocation =
    activeLocations.find((location) => location.id === merchant?.main_location_id) ??
    activeLocations[0] ??
    locations[0] ??
    null;

  return {
    merchant,
    selectedLocation,
  };
}

export function buildStoredSquareConnection(input: {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  merchantId?: string | null;
  merchantName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  scopes?: string[];
}) {
  const connection: SquareConnectionStored = {
    connected: true,
    environment: getSquareEnvironment(),
    merchantId: input.merchantId ?? null,
    merchantName: input.merchantName ?? null,
    locationId: input.locationId ?? null,
    locationName: input.locationName ?? null,
    connectedAt: new Date().toISOString(),
    scopes: input.scopes ?? [...SQUARE_SCOPES],
    accessTokenEncrypted: encryptSecret(input.accessToken),
    refreshTokenEncrypted: encryptSecret(input.refreshToken),
    expiresAt: input.expiresAt ?? null,
  };

  return connection;
}

export function getPublicSquareConnection(paymentConfig: unknown): SquareConnectionPublic {
  const square = typeof paymentConfig === "object" && paymentConfig !== null && "square" in paymentConfig
    ? (paymentConfig as { square?: Partial<SquareConnectionStored> }).square
    : undefined;

  return {
    connected: square?.connected === true,
    environment: square?.environment ?? null,
    merchantId: square?.merchantId ?? null,
    merchantName: square?.merchantName ?? null,
    locationId: square?.locationId ?? null,
    locationName: square?.locationName ?? null,
    connectedAt: square?.connectedAt ?? null,
    oauthConfigured: hasSquareOAuthConfig(),
  };
}

type SquareConnectionStoredShape = {
  connected?: boolean;
  environment?: SquareEnvironment;
  merchantId?: string | null;
  merchantName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  connectedAt?: string | null;
  scopes?: string[];
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string;
  expiresAt?: string | null;
};

export function getStoredSquareConnection(paymentConfig: unknown) {
  const square = typeof paymentConfig === "object" && paymentConfig !== null && "square" in paymentConfig
    ? (paymentConfig as { square?: SquareConnectionStoredShape }).square
    : undefined;

  if (!square?.connected || !square.accessTokenEncrypted || !square.refreshTokenEncrypted) {
    return null;
  }

  return square;
}

export async function callSquareApi<T>(
  path: string,
  init: RequestInit & { accessToken: string },
) {
  return squareFetch<T>(path, init);
}
