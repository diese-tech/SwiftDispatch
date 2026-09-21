/**
 * Behavior coverage for company settings read/update (issue #62): role
 * gating, tenant-scoped read/write, slug-uniqueness validation, partial
 * patch construction, and the public Square connection projection.
 *
 * The `companies` table fake actually filters by the `.eq()`/`.neq()`
 * predicates it's given (not a canned response), with two distinct company
 * fixtures, so these isolation assertions fail if the route's
 * `company_id` scoping is ever dropped or changed (per PR #68 review).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiRoleMock = vi.fn();
const getPublicSquareConnectionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/lib/square", () => ({
  getPublicSquareConnection: getPublicSquareConnectionMock,
}));

type Row = Record<string, unknown>;
type Predicate = (row: Row) => boolean;

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_COMPANY_ID = "88888888-8888-4888-8888-888888888888";
const ADMIN_ID = "99999999-9999-4999-8999-999999999999";

function forbiddenResponse() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

function adminProfile() {
  return { id: ADMIN_ID, email: "admin@example.com", company_id: COMPANY_ID, role: "admin" as const };
}

function makeSelectBuilder(getRows: () => Row[]) {
  const predicates: Predicate[] = [];
  const builder = {
    eq(column: string, value: unknown) {
      predicates.push((row) => row[column] === value);
      return builder;
    },
    neq(column: string, value: unknown) {
      predicates.push((row) => row[column] !== value);
      return builder;
    },
    single: async () => {
      const row = getRows().find((r) => predicates.every((p) => p(r)));
      return row ? { data: row, error: null } : { data: null, error: { message: "no rows" } };
    },
    maybeSingle: async () => {
      const row = getRows().find((r) => predicates.every((p) => p(r)));
      return { data: row ?? null, error: null };
    },
  };
  return builder;
}

function makeUpdateBuilder(getRows: () => Row[], patch: Row, forcedError: { message: string } | null = null) {
  const predicates: Predicate[] = [];
  const builder = {
    eq(column: string, value: unknown) {
      predicates.push((row) => row[column] === value);
      return builder;
    },
    select() {
      return {
        maybeSingle: async () => {
          if (forcedError) return { data: null, error: forcedError };
          const row = getRows().find((r) => predicates.every((p) => p(r)));
          if (!row) return { data: null, error: null };
          Object.assign(row, patch);
          return { data: { ...row }, error: null };
        },
      };
    },
  };
  return builder;
}

function freshCompanies(): Row[] {
  return [
    {
      id: COMPANY_ID,
      name: "Acme HVAC",
      slug: "acme-hvac",
      timezone: "America/New_York",
      sms_sender_name: "Acme",
      payment_provider: "manual",
      payment_config: { square: { connected: true } },
    },
    {
      id: OTHER_COMPANY_ID,
      name: "Rival Plumbing",
      slug: "rival-plumbing",
      timezone: "America/Chicago",
      sms_sender_name: "Rival",
      payment_provider: "manual",
      payment_config: {},
    },
  ];
}

function supabaseWithCompanies(companies: Row[], forcedError: { message: string } | null = null) {
  return {
    from: () => ({
      select: () => makeSelectBuilder(() => companies),
      update: (patch: Row) => makeUpdateBuilder(() => companies, patch, forcedError),
    }),
  };
}

async function getSettings() {
  const { GET } = await import("./route");
  return GET();
}

async function patchSettings(body: unknown, rawBody?: string) {
  const { PATCH } = await import("./route");
  return PATCH(
    new Request("http://localhost/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: rawBody ?? JSON.stringify(body),
    }),
  );
}

describe("GET /api/admin/settings", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    getPublicSquareConnectionMock.mockReset();
    getPublicSquareConnectionMock.mockReturnValue({ connected: false });
  });

  it("denies a dispatcher", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await getSettings();

    expect(response.status).toBe(403);
  });

  it("returns 404 when the caller's company_id has no matching row", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      // Only the other company exists -- proves the route's own .eq('id', ...)
      // filter is what's doing the work, not a canned response.
      supabase: supabaseWithCompanies(freshCompanies().filter((c) => c.id === OTHER_COMPANY_ID)),
    });

    const response = await getSettings();

    expect(response.status).toBe(404);
  });

  it("returns only the caller's own company, never another company's row", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithCompanies(freshCompanies()),
    });
    getPublicSquareConnectionMock.mockReturnValue({ connected: true });

    const response = await getSettings();
    const body = (await response.json()) as { company: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.company.id).toBe(COMPANY_ID);
    expect(body.company.name).toBe("Acme HVAC");
    expect(body.company.name).not.toBe("Rival Plumbing");
    expect(body.company.square).toEqual({ connected: true });
    expect(getPublicSquareConnectionMock).toHaveBeenCalledWith({ square: { connected: true } });
  });
});

describe("PATCH /api/admin/settings", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    getPublicSquareConnectionMock.mockReset();
    getPublicSquareConnectionMock.mockReturnValue({ connected: false });
  });

  it("denies a dispatcher", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await patchSettings({ name: "New Name" });

    expect(response.status).toBe(403);
  });

  it("rejects invalid JSON", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: adminProfile(), response: null, supabase: {} });

    const response = await patchSettings(undefined, "{not-json");

    expect(response.status).toBe(400);
  });

  it("rejects an empty name", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: adminProfile(), response: null, supabase: {} });

    const response = await patchSettings({ name: "   " });

    expect(response.status).toBe(400);
  });

  it("rejects an empty slug", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: adminProfile(), response: null, supabase: {} });

    const response = await patchSettings({ slug: "   " });

    expect(response.status).toBe(400);
  });

  it("rejects a reserved sandbox slug, even when it's currently unclaimed by any company", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      // No company holds "swiftdispatch-preview" yet -- proves this is
      // blocked by the reserved-slug check itself, not the uniqueness
      // conflict lookup (which would find no conflict and let it through).
      supabase: supabaseWithCompanies(freshCompanies()),
    });

    const response = await patchSettings({ slug: "swiftdispatch-preview" });

    expect(response.status).toBe(409);
  });

  it("rejects a slug already taken by a real other-company row", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithCompanies(freshCompanies()),
    });

    // "rival-plumbing" is OTHER_COMPANY_ID's real fixture slug, not a
    // canned value, so this proves the .eq('slug', slug) filter itself
    // finds the conflicting row rather than the mock always returning one.
    const response = await patchSettings({ slug: "rival-plumbing" });

    expect(response.status).toBe(409);
  });

  it("allows re-submitting the caller's own unchanged slug (proves .neq('id', ...) excludes the caller's own row)", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithCompanies(freshCompanies()),
    });

    // COMPANY_ID's own row already has slug "acme-hvac". If the route's
    // .neq('id', profile.company_id) were ever dropped, the uniqueness
    // query would match the caller's own row and this would wrongly 409.
    const response = await patchSettings({ slug: "acme-hvac" });

    expect(response.status).toBe(200);
  });

  it("allows a slug that's free across all companies", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithCompanies(freshCompanies()),
    });

    const response = await patchSettings({ slug: "brand-new-slug" });

    expect(response.status).toBe(200);
  });

  it("normalizes the slug, truncates smsSenderName, and writes only provided fields, scoped to the caller's company", async () => {
    const companies = freshCompanies();
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithCompanies(companies),
    });

    const response = await patchSettings({
      slug: "  My New Slug  ",
      smsSenderName: "This Name Is Definitely Way Too Long For Twenty Chars",
      paymentProvider: "stripe",
    });
    const body = (await response.json()) as { company: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.company.id).toBe(COMPANY_ID);
    expect(body.company.slug).toBe("my-new-slug");
    expect(body.company.sms_sender_name).toBe("This Name Is Definit");
    expect(body.company.payment_provider).toBe("stripe");
    // The other company's row must be untouched.
    const other = companies.find((c) => c.id === OTHER_COMPANY_ID)!;
    expect(other.slug).toBe("rival-plumbing");
    expect(other.payment_provider).toBe("manual");
  });

  it("returns 404 when the caller's company_id has no matching row to update", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithCompanies(freshCompanies().filter((c) => c.id === OTHER_COMPANY_ID)),
    });

    const response = await patchSettings({ timezone: "America/Chicago" });

    expect(response.status).toBe(404);
  });

  it("returns 500 when the update fails", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithCompanies(freshCompanies(), { message: "db error" }),
    });

    const response = await patchSettings({ timezone: "America/Chicago" });

    expect(response.status).toBe(500);
  });
});
