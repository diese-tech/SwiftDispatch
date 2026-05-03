# SwiftDispatch Mobile App Roadmap

## Goal
Frame a practical mobile app direction without committing to a full build too early.

The right first move is a technician-first app that supports the field workflow already working in the web product.

## Recommendation
Build phase 1 around technicians, not dispatchers and not broad customer self-service.

Why:
- Technician usage is naturally mobile.
- The workflows are already defined in the current product.
- The value is immediate: status updates, customer contact, maps, quote follow-through.
- It keeps scope narrow enough to ship without turning into a second full platform.

## Phase 1 App Scope
### Primary user
Technician

### Core jobs to be done
1. See the assigned job immediately after login.
2. Call the customer.
3. Open directions.
4. Update job status:
   - en route
   - arrived / in progress
   - quote pending
   - completed
5. View job detail and timeline.
6. Open or continue quote workflow.

### Nice-to-have, not phase 1
- Photo upload
- Push notifications
- Offline mode
- Full invoice handling
- Customer payments

## Existing Web Flows To Reuse
These routes already define the product behavior:
- `/tech`
- `/tech/job/[id]`
- `/intake/[slug]`
- `/dispatch`

The mobile app should reuse the same operational logic and API expectations wherever possible rather than inventing a parallel system.

## Suggested App Architecture Direction
### Best fit
Expo + React Native

Why:
- Fastest path to iOS and Android from one codebase
- Good fit for future camera/photo upload work
- Good fit for maps, deep linking, notifications, and device-native actions
- Easy to prototype while keeping the current Next.js product as the main web surface

### Shared strategy
- Keep Supabase auth model aligned with the existing product
- Reuse existing API routes and data contracts where possible
- Treat the mobile app as a focused client, not a second backend

## UI Direction
The mobile app should inherit the same brand system already established in the redesign:
- deep slate/navy shell
- teal primary actions
- warm accent for urgency
- premium rounded cards
- compact status pills
- simple, touch-first action layout

The app should feel like:
- the technician side of SwiftDispatch
- not a generic field-service template
- not a compressed desktop dashboard

## Phase 1 Screens
1. Login
2. Technician home
3. Job detail
4. Quote handoff / quote summary
5. Completion confirmation

## Phase 1 Success Criteria
1. A technician can complete a full job-status lifecycle from a phone.
2. The app reduces dispatcher follow-up for status visibility.
3. The app feels faster and cleaner than using the browser for the same workflow.

## Work Sequence
1. Keep improving mobile web behavior on existing technician and intake routes.
2. Lock the technician app information architecture.
3. Create low-fidelity mobile screen flows from the current route structure.
4. Start the Expo app scaffold only after the screen flow is approved.
5. Reuse real API/auth flows from the production product as early as possible.

## What Not To Do Yet
- Do not build a full dispatcher app.
- Do not build a customer app first.
- Do not split into separate mobile backends.
- Do not overbuild offline sync before the core workflow proves valuable.
