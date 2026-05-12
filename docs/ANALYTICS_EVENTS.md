# Analytics Events

Keep event naming stable. Prefer snake_case.

| Event | Trigger point | Properties (minimum) | Priority |
|---|---|---|---|
| `demo_clicked` | User clicks demo CTA on public pages | `page`, `cta_location`, `utm_source`, `utm_campaign` | P0 |
| `signup_started` | User begins signup form | `page`, `entrypoint`, `utm_source` | P0 |
| `signup_completed` | Account/company signup completed | `plan`, `company_id`, `user_role` | P0 |
| `login_success` | Successful login | `role`, `redirect_to`, `company_id` | P0 |
| `roi_calculator_used` | ROI calculator submitted/run | `inputs_hash`, `estimated_roi_band`, `page` | P1 |
| `job_created` | New job record created | `company_id`, `source`, `priority`, `is_demo` | P0 |
| `job_dispatched` | Job assigned to technician | `company_id`, `technician_id`, `job_priority` | P0 |
| `tech_status_updated` | Technician posts status/action | `company_id`, `technician_id`, `status`, `job_id` | P1 |
| `quote_created` | Quote created from job | `company_id`, `job_id`, `line_item_count`, `amount_total` | P0 |
| `invoice_created` | Invoice generated | `company_id`, `job_id`, `amount_total`, `payment_provider` | P1 |
| `job_completed` | Job moved to completed | `company_id`, `job_id`, `resolution_time_minutes` | P0 |

## Implementation notes
- [ ] Emit events server-side for authoritative business actions when possible.
- [ ] Emit client-side events for top-of-funnel UX interactions (e.g., CTA clicks).
- [ ] Include `company_id` on all product events.
- [ ] Avoid PII in event properties; hash or bucket values where possible.
