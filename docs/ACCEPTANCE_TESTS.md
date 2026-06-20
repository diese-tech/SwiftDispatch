# SwiftDispatch — Acceptance Tests

These tests describe the complete Phase 1 user journey. They are the definition of "working" for private beta.

---

## Quick Smoke (run before every deploy)

Run these manually after each production deploy. Takes ~10 minutes. Full acceptance tests below.

**Auth / login / logout**
- [ ] Sign in at `/login` as dispatcher → redirects to dispatch board.
- [ ] Log out from app header → returns to login. Protected routes reject anonymous access.

**Dispatcher flow**
- [ ] Create a new job from `/dispatch`. Assign technician, advance status through board.
- [ ] Job appears in board, assignment persists, status updates render without errors.

**Technician flow**
- [ ] Sign in at `/tech/login`. Open assigned job, submit status/action updates.
- [ ] Technician-only access enforced; updates visible to office side.

**Quote flow**
- [ ] Create quote from active job. Add/edit line items. Send quote link. Approve/decline via intake token route.
- [ ] Quote totals recalculate correctly; approval/decline state persists in operator views.

**Invoice flow**
- [ ] Generate invoice from completed job. Verify route access by role.
- [ ] Authorized roles can view invoice; unauthorized users are redirected.

**Admin flow**
- [ ] Sign in as admin. Open `/admin` + settings/users/templates/technicians.
- [ ] Create a dispatcher and add technician(s). Admin routes reject non-admin users.

**Super admin flow**
- [ ] Sign in as super_admin. Open `/superadmin` and `/superadmin/dispatch`.
- [ ] Create a company, verify scoped navigation. Super admin routes reject non-super-admin users.

**Demo tenant seed/reset**
- [ ] Run `node scripts/seed-demo-tenant.mjs` against a fresh environment to provision the demo company, user, and technicians.
- [ ] `POST /api/internal/reset-demo` with `Authorization: Bearer <INTERNAL_WORKER_SECRET>` returns `{ ok: true, jobsSeeded: 14 }`.
- [ ] Run the reset twice consecutively — no broken foreign keys or orphan references.

---

## Full Acceptance Tests

An automated smoke test covering the core API path lives at `src/e2e/job-flow.test.ts`. Run it with:

```bash
TEST_INTEGRATION=true npm run test:e2e
```

The manual tests below cover UI flows, edge cases, and multi-role coordination that the automated test cannot cover.

---

## Test Environment Setup

- Use the seeded QA tenant (`northwind-comfort-live-qa`) or run `npm run seed:live-qa` to reset it.
- Set `DISABLE_OUTBOUND_SMS=true` unless testing live SMS delivery.
- Three browser sessions recommended: one for customer, one for dispatcher, one for technician (or use incognito windows).

---

## AT-01 — Customer Intake Submission

**Who:** Customer (unauthenticated)  
**Route:** `/intake/[slug]`

**Steps:**
1. Open the intake URL for the QA company: `/intake/northwind-comfort-live-qa`
2. Fill in name, phone number, address, and problem description.
3. Check the SMS consent checkbox.
4. Submit the form.

**Expected:**
- Form submits without error.
- Confirmation message is shown with a job reference number.
- A status tracking link is provided (or sent via SMS if Twilio is enabled).
- The dispatcher board at `/dispatch` shows the new job in the **New** column immediately.
- Job `source` is `intake`.
- SMS consent is recorded on the job.

**Failure conditions:**
- Form submission fails or shows a generic error with no guidance.
- Job does not appear on dispatch board.
- Status token is missing or invalid.

---

## AT-02 — Customer Status Tracking

**Who:** Customer (unauthenticated)  
**Route:** `/intake/status/[token]`

**Steps:**
1. Open the status tracking link from AT-01.
2. Observe current job status.

**Expected:**
- Page loads without authentication.
- Shows current job status (e.g., "New — Waiting for assignment").
- Updates reflect status changes made by dispatcher/tech in near real-time (or on page refresh).

**Failure conditions:**
- Page fails to load or shows an error for a valid token.
- Status does not match actual job state.
- Token from one job resolves data from a different job or company.

---

## AT-03 — Dispatcher Creates Job Manually

**Who:** Dispatcher (authenticated)  
**Route:** `/dispatch/jobs/new`

**Steps:**
1. Log in as dispatcher at `/login`.
2. Navigate to `/dispatch` → click "New Job".
3. Fill in customer name, phone, address, problem description, urgency (Emergency).
4. Check the SMS consent checkbox.
5. Optionally assign a technician and quote template.
6. Save the job.

**Expected:**
- Job appears in the **New** column of the dispatch board.
- If a technician was assigned, the job immediately shows as **Assigned**.
- Assignment SMS is sent to the technician if Twilio is configured.
- Job `source` is `manual`.

**Failure conditions:**
- Save fails silently or with a generic error.
- Job appears in the wrong column.
- Assigned job does not send SMS.

---

## AT-04 — Dispatcher Assigns Technician

**Who:** Dispatcher  
**Route:** `/job/[id]`

**Steps:**
1. Open an unassigned job from the dispatch board.
2. Select an available technician from the dropdown.
3. Save.

**Expected:**
- Job status moves to **Assigned**.
- Technician receives SMS with job address, problem description, urgency label, and three status links (En Route, Arrived, Complete).
- Dispatcher board reflects the update immediately without a page refresh.
- The assigned technician's availability status changes to `on_job`.

**Failure conditions:**
- Job status does not advance to Assigned.
- Technician SMS is not sent (when Twilio is configured and SMS consent is recorded).
- Dispatch board does not update after save.
- Technician availability does not change.

---

## AT-05 — Technician Updates Status via SMS Links

**Who:** Technician (SMS, unauthenticated token)  
**Route:** `/api/tech-action?token=...`

**Steps:**
1. Tap the **En Route** link from the assignment SMS.
2. Observe response. Tap **Arrived**.
3. Observe response.

**Expected:**
- Each link returns a confirmation page in the browser.
- Job status advances: `assigned → en_route → in_progress`.
- Dispatcher board reflects each change immediately.
- Customer receives SMS updates at each transition (if Twilio is configured and consent is recorded):
  - En Route: "Your technician is on the way."
  - Arrived: "Your technician is on site."

**Failure conditions:**
- Link returns an error or blank page.
- Job status does not advance.
- An expired or replayed link changes job state (should be rejected).
- Customer SMS is sent without consent.

---

## AT-06 — Technician Builds and Submits Quote

**Who:** Technician (PIN auth)  
**Route:** `/tech`, `/tech/job/[id]`

**Steps:**
1. Log in to `/tech/login` with technician username and PIN.
2. Open the active job.
3. Select a quote template or add custom line items.
4. Submit the quote.

**Expected:**
- Login accepts the correct PIN and rejects incorrect PINs.
- Job shows on the tech portal with all relevant details (customer, address, problem).
- Quote is saved with line items and a total.
- Job status moves to **Quote Pending** after quote submission.
- Customer receives an SMS with a link to review the quote.
- Dispatcher board shows the job in the **Quote Pending** column.

**Failure conditions:**
- PIN login accepts an incorrect PIN.
- Tech can view jobs from a different company by modifying the job ID.
- Quote submission fails or does not advance job status.
- Customer SMS with quote link is not sent.

---

## AT-07 — Customer Approves Quote

**Who:** Customer (unauthenticated token)  
**Route:** `/intake/quote/[token]`

**Steps:**
1. Open the quote approval link from the customer SMS.
2. Review line items and total.
3. Click **Accept**.

**Expected:**
- Page shows a readable line-item breakdown with a total.
- Accept action succeeds.
- Job status moves to **Completed**.
- Quote status moves to `accepted`.
- `completed_at` timestamp is set on the job.
- Technician availability resets to `available`.
- Dispatcher board shows the job as **Completed**.
- Invoice is accessible at `/invoice/[jobId]` (dispatcher/admin only).

**Failure conditions:**
- Quote token from one job resolves a quote from another job or company.
- Accept action fails or leaves job in an inconsistent state.
- Invoice is inaccessible or shows incorrect data.
- Technician availability does not reset.

---

## AT-08 — Customer Declines Quote

**Who:** Customer (unauthenticated token)  
**Route:** `/intake/quote/[token]`

**Steps:**
1. Open the quote approval link.
2. Click **Decline** (optionally enter a reason).

**Expected:**
- Job status returns to **In Progress**.
- Quote status moves to `declined`.
- Dispatcher sees the job back in the **In Progress** column.
- No SMS is sent to the technician automatically (dispatcher must relay manually — known limitation).

**Failure conditions:**
- Job status does not return to In Progress.
- Quote is permanently closed with no path to revise and resubmit.
- Dispatcher board does not update.

---

## AT-09 — No Access / Reschedule

**Who:** Technician (PIN auth or SMS link)

**Steps:**
1. Tech encounters a property with no access.
2. From the tech portal `/tech/job/[id]`, set status to **No Access**.
3. Dispatcher observes the board and moves the job back to **New** for rescheduling.

**Expected:**
- Job moves to **No Access** status.
- Dispatcher can reassign to a new technician or reschedule.
- Job moves back to **New** from **No Access** when dispatcher initiates reschedule.

**Failure conditions:**
- No Access transition is not available from the tech portal.
- Dispatcher cannot move the job forward from No Access.

---

## AT-10 — Cancel a Job

**Who:** Dispatcher  
**Route:** `/job/[id]`

**Steps:**
1. Open any active job (New, Assigned, En Route, or In Progress).
2. Cancel the job, optionally adding a cancellation reason.

**Expected:**
- Job status moves to **Cancelled**.
- Cancellation reason is stored.
- Cancelled jobs remain visible on the board (or are filterable).
- No further status transitions are possible on a cancelled job.

**Failure conditions:**
- Cancel action is unavailable on active jobs.
- Cancelled job can be moved to another status.
- Cancellation reason is not persisted.

---

## AT-11 — Invoice View (Dispatcher/Admin Only)

**Who:** Dispatcher or Admin  
**Route:** `/invoice/[jobId]`

**Steps:**
1. Open a completed job's invoice from the dispatch board or job detail.
2. Review line items and total.
3. Use browser print to generate a PDF.

**Expected:**
- Invoice shows company name, customer name, job address, line items, and total.
- Page is print-ready (clean layout, no nav chrome in print view).
- Invoice is not accessible to unauthenticated users or users from a different company.

**Failure conditions:**
- Invoice is accessible without authentication.
- Invoice shows data from a different company's job.
- Print layout is broken or missing key fields.

---

## AT-12 — Multi-Tenant Isolation

**Who:** QA engineer with two test tenant accounts

**Steps:**
1. Log in as a dispatcher for Company A.
2. Attempt to access `/job/[id]` where the job ID belongs to Company B.
3. Attempt to access `/invoice/[jobId]` for Company B's job.
4. Attempt to call `PATCH /api/jobs/[id]` with Company B's job ID while authenticated as Company A.

**Expected:**
- All cross-tenant access attempts return 403 or 404.
- No Company B data is visible or modifiable from Company A's session.
- Realtime board subscription for Company A does not show Company B's job updates.

**Failure conditions:**
- Any cross-tenant data is returned or mutated.
- Status 200 is returned for a job that belongs to a different company.

---

## AT-13 — Technician Portal Access Boundaries

**Who:** Technician (PIN auth)

**Steps:**
1. Log in to `/tech` as a technician for Company A.
2. Attempt to navigate to `/tech/job/[id]` where the job belongs to Company B or a different technician in Company A.

**Expected:**
- Job detail is only accessible if the job is assigned to the logged-in technician's company.
- Technician cannot view or modify jobs assigned to other technicians in a different company.

**Failure conditions:**
- Technician can view jobs from another company by guessing job IDs.
- Technician can submit a quote against a job they are not assigned to.

---

## AT-14 — Admin Settings

**Who:** Admin  
**Route:** `/admin/settings`

**Steps:**
1. Log in as admin.
2. Update company name, timezone, and SMS sender name.
3. Save.

**Expected:**
- Settings are persisted and reflected immediately in the admin panel.
- A dispatcher (non-admin) cannot access `/admin/settings`.

**Failure conditions:**
- Settings do not persist after save.
- A dispatcher-role user can access or modify company settings.

---

## AT-15 — Full End-to-End Smoke (Automated)

**Route:** `src/e2e/job-flow.test.ts`

```bash
TEST_INTEGRATION=true npm run test:e2e
```

**Covers:**
1. Customer submits intake form → job created
2. Status token resolves correctly
3. Dispatcher assigns technician (direct DB)
4. Tech marks en_route via SMS token
5. Tech marks arrived on site
6. Tech marks complete → quote_pending
7. Dispatcher creates and sends quote
8. Customer accepts quote → job completed + invoice generated

**Expected:** All 8 steps pass with no errors. Job is cleaned up by teardown.

---

## Known Gaps (Acceptable for Phase 1)

| Gap | Notes |
|---|---|
| No automated tech-decline SMS | Dispatcher must manually notify tech when a quote is declined. |
| No PDF invoice | Browser Print → Save as PDF is the supported workaround. |
| No email notifications | All customer communication is SMS-only. |
| No customer accounts | Customers track jobs via token link only. |
| SMS delivery is best-effort | Twilio failures are stored in `sms_outbox` with `status = 'failed'`. Dispatchers can retry from the job detail page. Persistent failures require manual investigation. |
| Single timezone per company | Set in Admin → Settings. |
