# Security Operations Runbook

This document covers the security posture of **swiftdispatch.app** and the
operational (non-code) steps required to fully close the findings from the
web-check.xyz audit. Code-level fixes (response headers, `security.txt`, social
meta tags) are committed in the repo; the items below must be applied in the
registrar (Porkbun) and hosting (Vercel) dashboards.

## Vulnerability reporting

Researchers can find reporting details at
`https://swiftdispatch.app/.well-known/security.txt`
([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)). Contact is the
[privacy page](https://swiftdispatch.app/privacy) or `hello@swiftdispatch.app`.

> **Renewal:** `public/.well-known/security.txt` has an `Expires` field
> (currently `2027-06-24`). Update it to a new date ~1 year out before it lapses,
> otherwise the file is considered stale.

## Response headers (in code)

Configured in `next.config.ts` (`securityHeaders`), applied to every route:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-site`
- plus the existing CSP, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`.
- `poweredByHeader: false` removes the `X-Powered-By: Next.js` disclosure.

**Cross-Origin-Embedder-Policy is intentionally NOT set.** Enabling
`require-corp` would require every cross-origin subresource (images served via
`https:`, Sentry, fonts) to send a CORP header and would likely break the site.
Revisit only with full subresource testing.

## Manual / infrastructure follow-ups

### 1. DNSSEC — enable at Porkbun
Porkbun is the registrar/DNS for `swiftdispatch.app`.
1. Porkbun dashboard → domain `swiftdispatch.app` → **DNSSEC**.
2. Enable DNSSEC; Porkbun signs the zone and publishes the DS records.
3. Verify: `dig +dnssec swiftdispatch.app` returns `RRSIG` records and the
   `ad` flag is set.

### 2. Web Application Firewall (WAF)
The audit detected no WAF.
- **Option A (recommended):** Vercel project → **Settings → Firewall**, enable
  the managed firewall / Attack Challenge Mode.
- **Option B:** Front the domain with Cloudflare (proxied DNS) and enable its
  WAF managed rules.

### 3. HSTS preload submission
The `preload` directive now ships in the header. After it is **live in
production**, submit `swiftdispatch.app` at <https://hstspreload.org>.
Requirements (already met by our header): valid cert, redirect HTTP→HTTPS,
`max-age` ≥ 31536000, `includeSubDomains`, `preload`.
> Note: preloading is hard to undo — confirm all subdomains can serve HTTPS
> before submitting.

### 4. OCSP stapling — accepted / no action
TLS termination (and OCSP stapling) is managed by Vercel's edge and is not
configurable from application code. Tracked as accepted.

### 5. `Server: Vercel` header — accepted / no action
This header is injected by Vercel's edge network and cannot be removed in app
code. The app-level `X-Powered-By` header has been removed
(`poweredByHeader: false`); the `Server` value is left as-is. Tracked as accepted.

## Audit findings status

| Finding | Status |
|---------|--------|
| Cross-Origin-Opener-Policy | ✅ Fixed (header) |
| Cross-Origin-Resource-Policy | ✅ Fixed (header) |
| Cross-Origin-Embedder-Policy | ⚠️ Intentionally skipped (breakage risk) |
| HSTS max-age / includeSubDomains / preload | ✅ Fixed (header) + submit to preload list |
| security.txt | ✅ Added |
| Social tags (og:image) | ✅ Added |
| X-Powered-By disclosure | ✅ Removed |
| DNSSEC | ⏳ Manual — Porkbun |
| WAF | ⏳ Manual — Vercel/Cloudflare |
| OCSP stapling | ➖ Accepted (Vercel-managed) |
| Server header disclosure | ➖ Accepted (Vercel-managed) |
