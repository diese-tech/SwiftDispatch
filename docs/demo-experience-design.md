# Live Demo Experience — Design Plan

## Problem

The current live demo (`demo@swiftdispatch.app / demo`) only drops prospects into the dispatcher view. The tech portal (`/tech`) runs a completely separate auth flow (`/tech/login`) with its own session, so there is no way to switch between personas without logging out and logging in again with different credentials. Prospects never see the admin or analytics pages unless they find the nav links. The demo experience therefore only demonstrates one-third of the product.

## Goal

A prospect who lands on the live sandbox should be able to experience all three personas — dispatcher, technician, and admin — in one continuous session without re-authentication, friction, or any "please log in as a different user" interruptions.

---

## Personas & pages

| Persona | Real URL | Auth requirement |
|---|---|---|
| Dispatcher | `/dispatch` | Supabase session, role `admin` or `dispatcher` |
| Admin | `/admin`, `/analytics`, `/admin/technicians`, `/admin/templates` | Supabase session, role `admin` |
| Technician | `/tech` | Separate Supabase session, role `technician` |

The tech portal is the hard case: it uses an independent auth guard (`redirect('/tech/login')`) and renders a mobile-optimised layout. Solving it without a second login is the core design problem.

---

## Proposed solution: Demo persona switcher + tech preview route

### 1. Demo detection

Identify the demo session by checking `company.slug === 'demo'` (or a dedicated `is_demo` boolean on the company row). All demo-specific UI gates behind this check so it has zero effect on real tenants.

### 2. Persistent demo banner

A fixed bar pinned to the top of every `(app)` layout page when the session is detected as demo. It sits above the existing nav.

```
┌────────────────────────────────────────────────────────────────────┐
│  DEMO SANDBOX  ·  Viewing as Dispatcher            [Tech view →]  │
│                                         [Analytics]  [Admin]      │
└────────────────────────────────────────────────────────────────────┘
```

- Eyebrow label shows which persona is active
- One-click links to `/dispatch`, `/demo/tech`, `/analytics`, `/admin`
- Resets demo data button (calls existing `resetDemoTenant` logic)
- Small, unobtrusive — maybe 32px tall, navy background, mono font

### 3. New route: `/demo/tech`

A new page inside the `(app)` route group that:
- Requires a normal dispatcher/admin session (no tech re-auth)
- Reads one of the demo technicians' current job from the database (e.g., whichever tech has `current_job_id` set)
- Renders the **exact same JSX** as `/tech/page.tsx` but without the `redirect('/tech/login')` guard
- Wraps the content in an iPhone-style viewport frame on desktop (so it's obvious this is a mobile-first view) — the same frame idea as the `DemoPreview` marketing mockup, but real and interactive

The page header should say: **"Tech view — Jason K."** with a note that this is the mobile experience dispatchers' field techs see on their phones.

Because it uses the same real data (live jobs, real status transitions), the prospect can:
- See Jason K.'s current active job
- Tap "Mark Arrived" and watch the dispatch board update in real time (Supabase realtime)
- See the status change reflected in the `/dispatch` kanban if they open it in another tab

This is the demo's killer moment: show the realtime feedback loop between dispatcher and tech.

### 4. Admin & analytics

These already work for the demo account (role is `admin`). The banner just makes them discoverable. Add a brief "Demo company" callout on the admin page when in demo mode so prospects understand this is their company's data.

---

## Tech view page spec

**Route:** `/app/(app)/demo/tech/page.tsx`

**Auth:** `getCurrentProfile()` (dispatcher session). If not demo company, redirect to `/dispatch`.

**Data fetch:**
```ts
// Pick the first demo tech with an active job, fallback to any tech
const tech = await supabase
  .from('technicians')
  .select('id, name, current_job_id')
  .eq('company_id', profile.company_id)
  .not('current_job_id', 'is', null)
  .limit(1)
  .maybeSingle()
```

**Rendering:**
- Desktop: center a `max-w-[390px]` container inside a phone-chrome frame (same rounded-[2.5rem] border-8 border-slate-800 style from the marketing mockup). Add a label above: "Field technician view · Jason K. · iPhone"
- Mobile: render without the phone frame (the actual screen IS a phone)
- Reuse the existing tech page JSX (extract to a shared `TechJobView` server component that both `/tech/page.tsx` and `/demo/tech/page.tsx` consume)

**Interactivity:** The `TechJobActionsClient` buttons work as-is — they POST to `/api/jobs/[id]` which only checks `company_id`, not tech auth. So status transitions work live in the demo.

---

## Demo banner component spec

**File:** `src/components/DemoBanner.tsx` (server component, reads profile)

**Placement:** Top of `src/app/(app)/layout.tsx` (the shared app shell), conditionally rendered:

```tsx
{profile.company?.slug === 'demo' && <DemoBanner currentPath={pathname} />}
```

**Links:**
- Dispatcher → `/dispatch`
- Tech view → `/demo/tech`
- Analytics → `/analytics`
- Admin → `/admin`
- Reset data → server action calling `resetDemoTenant()`

**Active state:** Highlights the current persona based on route prefix.

---

## Data state for the demo

For the demo to work across all three views, the seed data needs to be structured so:

1. At least one technician (`Jason K.`) has `current_job_id` pointing to an active job (status `assigned` or `en_route`)
2. Quote data exists so analytics page shows real numbers (not all dashes)
3. `status_events` rows exist so the timeline on job detail pages is populated
4. The nightly reset (already in place) returns to this baseline state

The seed script (`scripts/seed-demo-tenant.mjs`) already creates jobs; it needs a small addition to set `current_job_id` on one technician after seeding.

---

## Implementation order

1. **Extract `TechJobView`** — pull the rendering logic out of `/tech/page.tsx` into a shared server component so both routes can use it without duplication
2. **Add `/demo/tech` route** — demo-gated, dispatcher-authed, renders `TechJobView` in phone frame
3. **Add `DemoBanner`** — server component, conditionally shown in `(app)` layout
4. **Seed fix** — ensure `current_job_id` is set on a technician after seeding
5. **Analytics data** — ensure seed creates enough accepted quotes and status events for the analytics page to show real numbers

---

## Open questions

- **Should the tech view demo buttons (En Route, Arrived, etc.) be live or blocked?** Live is more impressive but means the demo state drifts. Since the nightly reset restores it, live is probably the right call.
- **Should we show a second demo persona credential** (`tech@swiftdispatch.app / demo`) on the marketing page as a fallback for prospects who want a real mobile test on their phone? Low engineering cost, worth considering alongside the `/demo/tech` route.
- **Should the demo banner show a countdown to next reset?** ("Resets in 6h 22m") — adds trust, shows the sandbox is managed.
