# SwiftDispatch — Operations Guide

This guide is for dispatchers, admins, and technicians using SwiftDispatch day-to-day. No technical background needed.

---

## Who uses this system

| Role | What they do |
|---|---|
| **Admin** | Sets up the account, manages technicians, configures settings |
| **Dispatcher** | Creates and assigns jobs, monitors the board, communicates with customers |
| **Technician** | Receives job assignments by SMS, updates status from the field, submits quotes |
| **Customer** | Submits requests via the intake form, receives SMS updates, approves quotes |

---

## Roles in detail

### Dispatcher / Admin
Dispatchers work from the board at `/dispatch`. They see every active job as a card, organized by status. Dragging a card or using the job detail page moves it forward.

Admins have all dispatcher access plus the admin panel (`/admin`) for managing technicians, quote templates, and company settings.

### Technician
Technicians never log into a computer. They receive a text message when assigned to a job. That message contains three links — En Route, Arrived, and Complete — which they tap as the job progresses. If they need to build a quote, they log into the tech portal at `/tech` using their username and 4-digit PIN.

---

## Core Workflows

### 1. Creating a job

**Dispatcher creates manually:**
Go to `/dispatch` → New Job. Fill in customer name, phone, address, problem description, and urgency. Check the SMS consent box if the customer verbally agreed to receive texts. Optionally assign a technician and select a quote template right at creation.

**Customer submits via intake form:**
Share your intake link (`https://your-app.vercel.app/intake/your-slug`) with customers. They fill in their details, check the SMS consent box, and submit. The job appears on the dispatch board as **New** immediately, and the customer gets a confirmation text with a tracking link.

---

### 2. Assigning a technician

Open the job from the dispatch board. Select a technician from the dropdown. On save:
- The job moves to **Assigned**
- The technician receives an SMS with the job address, problem description, and three one-tap status links

The technician does not need to open any app or log in to update their status.

---

### 3. Technician job execution

The technician works entirely from their phone:

1. **Tap "En Route"** in the SMS → job moves to En Route, dispatcher sees it instantly
2. **Tap "Arrived"** → job moves to In Progress
3. On-site, if a quote is needed: log into `/tech` with username + PIN → open the job → build the quote using a template or custom line items → submit
4. **Tap "Complete"** → job moves to Quote Pending (if a quote was submitted) or prompts the tech to submit one first

---

### 4. Quote approval

When a tech submits a quote:
- The job moves to **Quote Pending**
- The customer receives an SMS with a link to review the quote
- The customer sees a line-item breakdown and taps **Accept** or **Decline**

**If accepted:** job moves to Completed, an invoice is generated, the tech's availability resets to Available.

**If declined:** job moves back to In Progress. The dispatcher sees this on the board. The customer can optionally leave a reason. No SMS is sent to the dispatcher — they see the change in real time on the board.

---

### 5. Job completion

Once a job is Completed:
- The invoice is available at `/invoice/[jobId]` (dispatcher/admin only)
- Print it from the browser — no PDF download yet
- The technician is automatically marked as Available for the next job

---

## Real-world scenario

**Emergency AC call at 2pm on a hot day**

1. Customer calls in. Dispatcher opens **New Job**, sets urgency to **Emergency**, checks the SMS consent box, and creates the job.
2. Dispatcher assigns the nearest available tech. Tech gets an SMS within seconds: job address, "EMERGENCY" label, and three status links.
3. Tech taps **En Route**. Customer gets a text: *"Your technician is on the way."*
4. Tech arrives, taps **Arrived**. Customer gets: *"Your technician is on site."*
5. Tech diagnoses the issue, logs into `/tech`, selects the "AC not cooling — refrigerant recharge" template, adjusts the quantities, and submits the quote.
6. Customer gets an SMS with a link to approve. They tap **Accept** on their phone.
7. Job closes. Dispatcher sees **Completed** on the board. Invoice is ready to print.

Total dispatcher touches: 2 (create job, assign tech). Everything else is automated.

---

## System rules

### Job status flow

```
New → Assigned → En Route → In Progress → Quote Pending → Completed
```

Each step only moves forward. You cannot skip steps or go backward — except:
- Quote Pending → In Progress (if customer declines the quote)
- No Access → New (to reschedule)
- Any active status → Cancelled

### SMS consent
The system will not send SMS to a customer unless consent is recorded. Consent is captured either:
- Automatically when a customer submits the intake form
- Manually when a dispatcher checks "Customer verbally consented" on a new job

If consent is not recorded, SMS buttons are disabled on that job.

### Technician SMS links
Each link in a tech's assignment SMS is single-use by design and expires after 24 hours. If a link expires, the tech can still update their status by logging into `/tech`.

---

## Edge cases

### Reassigning a job to a different technician
Open the job detail, select a new technician from the dropdown. The new tech gets an assignment SMS. The previous tech's availability is reset to Available automatically.

### Cancelling a job
Any job that hasn't reached Completed or Cancelled can be cancelled. Open the job, change the status to Cancelled, and optionally add a cancellation reason. Cancelled jobs stay visible on the board until filtered out.

### Customer declines the quote
The job moves back to In Progress. The technician should be notified directly (call or text) — the system does not automatically alert the tech when a quote is declined. The dispatcher sees the status change on the board in real time.

### Technician can't access the property
The tech taps "Complete" and updates the status to **No Access** from the tech portal. The dispatcher sees this and can reschedule by moving the job back to New and reassigning.

---

## Current limitations

These are known gaps in the current version:

- **Payments are manual.** Invoices are generated but there is no online payment link. You collect payment offline and mark it manually.
- **No PDF invoices.** Use browser Print → Save as PDF as a workaround.
- **No email notifications.** All customer communication is SMS only.
- **No customer accounts.** Customers track jobs via a token link in their SMS — they cannot log in or see job history.
- **Twilio required for SMS.** If Twilio is not configured, the system works but no messages are sent.
- **Single timezone per company.** Set in Admin → Settings.
