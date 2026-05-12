# Deployment Checklist

## Pre-deploy
- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] Run route smoke tests from `docs/QA_SMOKE_TESTS.md`
- [ ] Lighthouse check (public pages)
- [ ] VibeDoctor rescan
- [ ] Confirm required env vars are present for target environment
- [ ] Confirm Supabase/Twilio callback URLs and secrets

## Deploy
- [ ] Deploy to production
- [ ] Watch build/deploy logs for warnings or route generation changes

## Post-deploy (first 30 minutes)
- [ ] Auth routes: `/login`, `/tech/login`, logout flow
- [ ] Public routes: `/`, `/demo`, `/pricing`, `/features`, `/roi-calculator`
- [ ] Dashboard/product routes: `/dispatch`, `/admin`, `/superadmin`, `/tech`
- [ ] Verify key analytics events are arriving
- [ ] Check error monitoring for new spikes
- [ ] Check performance regression (LCP/TBT trend + quick Lighthouse spot check)

## Post-deploy (same day)
- [ ] Record deploy notes: what changed, risks, roll-forward/rollback decision
- [ ] Create follow-up issues for any degraded metrics or flaky smoke tests
