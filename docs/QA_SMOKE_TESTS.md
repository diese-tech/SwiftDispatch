# QA Smoke Tests

Run this before launch and after every production deploy.

## Auth / login / logout
- [ ] Go to `/login` and sign in as dispatcher.
- [ ] Log out from app header.
- Expected: successful login redirects to dispatch; logout returns to login; protected routes reject anonymous access.

## Dispatcher flow
- [ ] Create a new job from dispatch.
- [ ] Assign technician and update status through board.
- Expected: job appears in board, assignment persists, status updates render without refresh errors.

## Technician flow
- [ ] Sign in as technician at `/tech/login`.
- [ ] Open assigned job and submit status/action updates.
- Expected: technician-only access enforced; updates are accepted and visible to office side.

## Quote flow
- [ ] Create quote from an active job.
- [ ] Add/edit line items; send quote link; approve/decline via intake token route.
- Expected: quote totals recalculate correctly; approval/decline state persists and is visible in operator views.

## Invoice flow
- [ ] Generate invoice from completed or billable job.
- [ ] Verify invoice route access by role.
- Expected: authorized roles can view invoice; unauthorized users are redirected.

## Admin flow
- [ ] Sign in as admin and open `/admin` + settings/users/templates/technicians.
- [ ] Create a dispatcher and add technician(s).
- Expected: admin routes accessible only for admin role; create actions persist to tenant-scoped records.

## Super admin flow
- [ ] Sign in as super_admin and open `/superadmin` and `/superadmin/dispatch`.
- [ ] Create a company and verify scoped navigation.
- Expected: super admin-only routes reject non-super-admin users; cross-company management works.

## Demo tenant seed/reset
- [ ] Open `/admin/seed-demo` with feature flag enabled.
- [ ] Seed demo data; run reset path/process; reseed.
- Expected: seed/reset is repeatable without broken foreign keys or orphan references.
