# SwiftDispatch | Production Readiness Checklist

**Assessment status:** Not audited. Unchecked means not yet evaluated, not necessarily missing.

**Canonical source:** [Diese Playbooks](https://github.com/diese-tech/playbooks/blob/main/02-repo-guardrails/production-readiness-inventory.md). **Original checklist:** [Mardehaym on X](https://x.com/mardehaym/status/2110705357492203564).

## First-pass audit priorities

SwiftDispatch is a multi-tenant HVAC dispatch application with public intake, technician status links, SMS delivery, and external integrations. The following are audit targets, not confirmed defects:

- Verify tenant separation in reads, mutations, worker jobs, logs, links, exports and support tooling.
- Test retry/idempotency and partial failure for jobs, quotes, SMS outbox, payment interactions, and externally triggered updates.
- Validate production rate limiting, reliable background worker processing, and recovery from third-party outages.
- Exercise backups/restores, migration rollback/forward-fix plans, and production-like concurrency/load.
- Confirm role, session and demo-vs-live separation; operator audits; access revocation.
- Test critical user journeys, accessibility, error feedback, and support/admin correction paths.
- Defer enterprise-only SAML/SCIM, SOC 2, multi-region, and complex commercial billing until sales contracts or realistic risk require them.

For each applicable item, track **Required now / Later / N/A**, implementation evidence, verification test, owner, and linked issue or PR.

---

## Complete Cross-Project Inventory (146 checks)

**Status:** Reference inventory, not a claim that every control is required or implemented.

**Source:** [Mardehaym on X](https://x.com/mardehaym/status/2110705357492203564), supplied in full by the repository owner on 2026-10-15. This version reorganizes and clarifies the source checklist rather than quoting it verbatim.

**Related:** [Production Readiness Audit](../05-prompts/production-readiness-audit.md) | [MVP Readiness](../06-decision-rubrics/mvp-readiness-checklist.md)

## Using this checklist

Scope each requirement before converting it into work. Record **Applicable now / Later / Not applicable**, rationale, owner, evidence, and verification. Distinguish production blockers from enterprise-only or regulated-industry requirements. An unchecked item is a prompt to assess risk, not proof of a bug. Prefer the smallest justified control rather than adopting costly architecture by default.

For any applicable requirement, collect: **current behavior | evidence | failure mode | priority | owner | test or operational proof**. Use the production-readiness audit for a structured evidence-first investigation. Avoid marking an item done on the basis of a README or AI assertion alone.

## Architecture and data

- [ ] Design the database schema intentionally instead of improvising tables one by one.
- [ ] Design for future customer-specific variations without brittle one-off changes.
- [ ] Document architecture decisions and why alternatives were rejected.
- [ ] Create human-readable code and a maintainable module structure.
- [ ] Remove dead code and refactor oversized AI-accumulated files before they become dangerous.

## Identity and access control

- [ ] Support legitimate email formats including plus-addressing.
- [ ] Make password reset links time-limited and single-use.
- [ ] Provide MFA and a secure lost-device recovery process where appropriate.
- [ ] Set session lifetimes and allow revoking all of a user's sessions.
- [ ] Support enterprise SSO when contracted.
- [ ] Support SAML identity providers when contracted.
- [ ] Support SCIM provisioning and prompt deprovisioning when contracted.
- [ ] Use granular role- and permission-based authorization where needed.
- [ ] Prevent a user accessing another user's records by changing an ID or URL.
- [ ] Enforce tenant isolation across application queries, database policies, jobs, exports, and support tools.
- [ ] If support impersonation is enabled, require authorization and audit each use.
- [ ] Rate-limit authentication and detect credential stuffing.
- [ ] Balance account lockouts with safe recovery for legitimate users.
- [ ] Enforce least privilege for all humans, services, and AI agents.

## Database change safety and recovery

- [ ] Provide repeatable forward database migrations and a tested recovery plan.
- [ ] Keep migrations from unnecessarily locking large production tables during peak usage.
- [ ] Index real high-volume queries and check their query plans.
- [ ] Configure database connection pooling appropriate to concurrency and hosting.
- [ ] Schedule and monitor backups based on actual recovery requirements.
- [ ] Run and document actual backup restore tests.
- [ ] Enable point-in-time recovery when the recovery-point objective justifies it.
- [ ] Provide soft delete and undo for records where accidental deletion is likely, without violating retention rules.
- [ ] Enforce data retention and deletion schedules in code.
- [ ] Store times and timezones correctly; verify daylight-saving transitions.
- [ ] Store monetary values using exact types (integer minor units or suitable decimal types).
- [ ] Implement jurisdiction-appropriate currency precision, rounding, and tax rules.
- [ ] Use idempotency keys for payments and irreversible operations.
- [ ] Deduplicate repeated form submissions and user actions.
- [ ] Make deep pagination stable and performant, using cursors where appropriate.
- [ ] Support data exports customers can actually use.
- [ ] Safely ingest older CSV encodings, delimiters, malformed rows, and legacy dates.

## Input handling, application security, and dependencies

- [ ] Validate user input on the server, not only in browser forms.
- [ ] Support apostrophes in names and other ordinary punctuation.
- [ ] Support accents, emoji, full Unicode, and right-to-left text.
- [ ] Keep secrets out of source code, version history, logs, and AI conversation prompts.
- [ ] Rotate credentials and tokens that have been exposed.
- [ ] Verify that every AI-suggested package is real, trusted, and the intended dependency.
- [ ] Scan dependencies and respond to relevant advisories.
- [ ] Escape and validate inputs and outputs according to their context.
- [ ] Defend against SQL injection, XSS, CSRF, SSRF, broken access control, and other applicable OWASP risks.
- [ ] Scan and constrain file uploads, cap their size, and store them where they cannot execute.
- [ ] Use precise CORS policies instead of universal origins.
- [ ] Serve appropriate browser security headers.
- [ ] Encrypt sensitive data in transit and at rest.
- [ ] Record security-relevant actions while excluding passwords, tokens, card details, and other prohibited sensitive contents.
- [ ] Run security assessments or penetration testing appropriate to risk and contractual requirements.
- [ ] Maintain a responsible vulnerability disclosure and triage process.
- [ ] Document response steps for lost or stolen devices with production access.

## Privacy, regulation, legal obligations, and evidence

- [ ] Prepare evidence-backed responses for buyer security questionnaires.
- [ ] Determine whether SOC 2 attestation is required by the market or customer contract; establish real controls, evidence, and audit when pursuing it.
- [ ] Assess HIPAA applicability based on covered-entity/business-associate roles and actual regulated PHI handling; do not assume every patient-related record automatically triggers HIPAA.
- [ ] Execute required business associate agreements with applicable vendors, including AI providers if they handle PHI as business associates.
- [ ] Log record views, not only edits, when sensitivity and audit obligations require it.
- [ ] Keep payment card data out of application storage when possible and assess PCI DSS scope with payment providers.
- [ ] Implement GDPR/other privacy deletion and access requests, with documented handling for backup rotation, immutable logs, and legal exceptions.
- [ ] Respect data residency obligations where contractually or legally required.
- [ ] Perform periodic access reviews and record approvals.
- [ ] Keep terms and privacy notices consistent with actual application behavior.

## Delivery, infrastructure, and resiliency

- [ ] Keep dev, staging, and production appropriately isolated and representative.
- [ ] Use infrastructure-as-code where reproducible infrastructure matters.
- [ ] Require tests and checks in CI before production deployment.
- [ ] Provide a dependable rollback or forward-fix procedure for failed releases.
- [ ] Deploy without customer-visible downtime where promised or operationally necessary.
- [ ] Use feature flags to separate deployment from release when valuable.
- [ ] Design autoscaling for credible traffic spikes.
- [ ] Use a CDN or equivalent delivery optimization for geographically distributed customers when needed.
- [ ] Monitor DNS and TLS certificate ownership, validation, and renewal.
- [ ] Move slow work into durable background queues.
- [ ] Retry transient failures with bounded exponential backoff and jitter.
- [ ] Use a dead-letter mechanism or equivalent visibility and recovery for exhausted retries.
- [ ] Prevent duplicate scheduled-job execution when multiple replicas exist.
- [ ] Cache deliberately and invalidate/update caches when underlying state changes.
- [ ] Configure SPF, DKIM, and DMARC for transactional mail domains.
- [ ] Handle transactional email bounces and abuse complaints.
- [ ] Enforce storage lifecycle rules to avoid accumulating temporary files.
- [ ] Alert on budget overruns, including runaway automation or model usage.
- [ ] Write and periodically rehearse disaster recovery steps.
- [ ] Consider multi-region failover only when uptime obligations and actual failure modes justify it.

## Observability, incidents, and operational ownership

- [ ] Centralize structured, searchable logs.
- [ ] Group related errors rather than flooding channels with duplicates.
- [ ] Run external uptime and health checks.
- [ ] Route actionable alerts to a responsible human, with tuned thresholds.
- [ ] Track latency, error rate, throughput, and saturation in appropriate dashboards.
- [ ] Trace slow requests across services where distributed tracing is justified.
- [ ] Define on-call ownership and a reachable escalation path.
- [ ] Create runbooks that explain high-severity alerts, diagnosis, and response.
- [ ] Hold constructive postmortems and follow through on corrective actions.
- [ ] Provide a customer status page if scale or communication commitments justify it.
- [ ] Provide support tools and an admin interface so operators can handle routine issues without engineering intervention.

## Testing and quality assurance

- [ ] Write unit tests against intended business rules, not only AI-generated implementation behavior.
- [ ] Test third-party API integrations and failure paths.
- [ ] Run end-to-end tests for critical revenue and user journeys.
- [ ] Perform load tests before launches where peak demand creates meaningful risk.
- [ ] Use realistic, synthetic or de-identified test data rather than copying live personal data.
- [ ] Add regression tests for previously fixed failures.
- [ ] Test on older hardware and browsers real customers still use.
- [ ] Audit accessibility against applicable standards and requirements.
- [ ] Require human review of AI-generated code before release.

## Billing and commercial operations

- [ ] Handle subscriptions, plan upgrades and downgrades, and proration when offered.
- [ ] Handle failed-payment retries and customer dunning where applicable.
- [ ] Produce invoices with customer purchase-order identifiers when required.
- [ ] Calculate sales tax and VAT for supported selling jurisdictions.
- [ ] Support credits, refunds, and partial refunds.
- [ ] Ensure usage metering reconciles exactly with billing.
- [ ] Support negotiated annual contracts and custom commercial terms where sold.
- [ ] Produce finance reports that reconcile with payment and accounting systems.

## APIs, notifications, and integrations

- [ ] Verify webhook signatures and reject invalid senders.
- [ ] Retry outgoing webhooks and keep delivery/failure logs.
- [ ] Version public APIs so integrations survive compatible product changes.
- [ ] Allow customers to create, scope, rotate, and revoke API keys when customer APIs are offered.
- [ ] Rate-limit APIs fairly to protect availability without crippling real integrations.
- [ ] Handle third-party API schema drift and unexpected response changes.
- [ ] Refresh OAuth tokens safely and handle revocation/expiration.
- [ ] Provide integration sandbox environments where external customers need them.
- [ ] Allow users to control optional notifications.
- [ ] Test transactional email rendering in commonly used mail clients.

## AI-specific controls

- [ ] Defend model inputs, retrieved text, tool outputs, and user fields against prompt injection.
- [ ] Minimize/redact customer and patient data sent to external models; honor legal, security, and contractual restrictions.
- [ ] Cap and monitor model spending per tenant or customer as appropriate.
- [ ] Run evaluation suites to detect behavior changes after model or prompt upgrades.
- [ ] Provide a safe fallback for provider outage or degraded output.
- [ ] Plan for model deprecation and provider migration.
- [ ] Keep only permissible, access-controlled prompt and output diagnostics.
- [ ] Require human approval for consequential or irreversible AI-initiated actions.

## Product experience and accessibility

- [ ] Make pages workable over slow or unreliable connections.
- [ ] Design empty, loading, success, and error states for each important screen.
- [ ] Show actionable errors instead of generic failure messages.
- [ ] Preserve a form's entered values when validation fails.
- [ ] Provide undo where changes are reversible.
- [ ] Support keyboard navigation and assistive technologies.
- [ ] Localize text, dates, and numbers for supported markets.
- [ ] Make back navigation behave predictably.

## Maintainability, documentation, and continuity

- [ ] Require code review for every production change.
- [ ] Use a branching and merge strategy that prevents clobbered work.
- [ ] Upgrade dependencies on a regular risk-based cadence.
- [ ] Upgrade frameworks before they lose security support.
- [ ] Maintain a README that gets another engineer running locally without tribal knowledge.
- [ ] Document critical handoff and operational procedures.
- [ ] Publish a customer-visible changelog where relevant.
- [ ] Keep domains, cloud accounts, and source repositories controlled by the business rather than an individual employee.
- [ ] Reduce the bus factor by distributing access, knowledge, and incident ownership.

## Human expertise remains necessary

- Senior engineer: review generated changes, debug emergent defects, and establish correctness.
- Backend engineer: data modeling, correctness, and safe live-database migrations.
- DevOps/platform: deployments, infrastructure, rollbacks, reliability, and cloud costs.
- On-call/operator: respond to after-hours failures and restore service.
- Security/compliance: patch vulnerabilities, assess risks, handle regulated data and audit requests.
- QA: independently verify tests, failure paths, and core workflows.
- Tech lead/architect: control change blast radius and design for multi-user, multi-tenant operation.
- Knowledge steward: record why choices were made so a future maintainer can operate the system.

## Decision guardrails

- An MVP does not automatically need SAML, SCIM, SOC 2, multi-region, a CDN, or 24/7 on-call. Require those when usage, risk, contract, or scale justifies them.
- HIPAA applicability and GDPR deletion/backup requirements need specific legal and technical analysis rather than blanket statements.
- Soft delete and indefinite retention are not substitutes for mandated deletion.
- Controls marked complete need a repeatable validation step or operational evidence.
- Keep one canonical checklist here; product repositories may link to this file and capture their own applicability/evidence matrix.
