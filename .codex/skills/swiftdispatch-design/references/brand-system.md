# SwiftDispatch brand system

## Design intent

SwiftDispatch should feel fast, calm, dependable, and operational. It serves small HVAC teams that need clarity under time pressure. Avoid novelty that slows scanning or makes the product feel experimental.

The direction combines:

- Sleek: minimal surfaces, blue-led palette, subtle interaction, consistent spacing
- Enterprise: data hierarchy, explicit states, responsive productivity workflows, accessibility
- Storytelling: marketing pages that move from operational pain to workflow proof and a clear demo action

## Color system

Use semantic tokens rather than raw values.

| Role | Default | Purpose |
| --- | --- | --- |
| Brand blue | `#1155F5` | Primary actions, active navigation, links, focus, selected states |
| Brand blue hover | `#0D47D9` | Hover and pressed emphasis |
| Brand blue soft | `#EAF0FF` | Selected or informational backgrounds |
| Brand navy | `#050B38` | Headings, high-emphasis text, dark brand surfaces |
| Orange | `#F08A24` | One primary marketing CTA or urgency accent; never routine navigation |
| Canvas | `#FAFAFA` | Application background |
| Surface | `#FFFFFF` | Cards, forms, panels, navigation |
| Text | `#18181B` | Primary product copy |
| Muted text | `#71717A` | Supporting copy that still passes contrast |
| Border | `#E4E4E7` | Dividers and component outlines |
| Success | `#15803D` | Completed, connected, successful |
| Warning | `#B45309` | Delayed, reconnecting, attention |
| Danger | `#B91C1C` | Failed, destructive, emergency |

Do not use teal or purple as general brand/action colors. Do not use semantic status colors decoratively.

## Typography

- Use Manrope for interface, body, and display text. Its open shapes keep the brand modern without making large headlines feel compressed.
- Use JetBrains Mono for timestamps, counts, identifiers, compact labels, and operational metadata.
- Keep body copy in the sans-serif family; mono text is supporting information, not prose.
- Use sentence case for buttons and headings. Reserve uppercase for short metadata labels.
- Prefer a compact product scale: 12, 14, 16, 20, 24, 32 pixels. Marketing display sizes may exceed it when responsive.

## Spacing and shape

- Use an 8-point spacing rhythm, with 4 pixels for fine alignment.
- Prefer 8-12px component radii and pill shapes only for filters, compact statuses, and primary CTAs.
- Keep shadows subtle. Use borders and spacing for hierarchy before elevation.
- Maintain a minimum 44x44px touch target for primary mobile interactions.

## Logo rules

Approved assets live in `assets/`:

- `swift-dispatch-primary.png`: horizontal navigation and wide brand placement
- `swift-dispatch-mark.png`: favicon, compact sidebar, and icon-only placement
- `swift-dispatch-stacked.png`: centered authentication, presentation, and square placement

All approved PNGs have transparent backgrounds.

- Preserve aspect ratio and transparent padding.
- Do not recolor, redraw, stretch, crop into the artwork, or add effects.
- Place the navy-and-blue artwork on white or very light neutral surfaces.
- Do not add a white rectangle directly to the image or link wrapper. If a dark layout requires contrast, change the surrounding section or create an approved inverse asset.
- Give linked logos the accessible name `SwiftDispatch home`; avoid redundant adjacent text.

## Marketing surfaces

- Lead with the operational problem and the outcome, then show workflow proof.
- Use the approved `Signal Path` landing direction: a route-line hero, event progression cards, workflow steps, live dispatch-board proof, navy team-fit section, and soft-blue demo close.
- A soft-blue public header, purposeful route/status motion, and the warm neutral promise card are approved marketing expressions.
- Use one dominant conversion action per section. Orange may identify the primary demo CTA; blue remains the product interaction color.
- Use the horizontal logo in the public header on a light, translucent surface.
- Keep navigation underlines and micro-interactions subtle and 150-300ms.
- Avoid generic SaaS decoration, excessive gradients, glass effects, and unrelated stock imagery.

## Product surfaces

- Optimize for scanning, prioritization, and confident action.
- Use blue for interactive and selected states. Use status colors only when they communicate job or system state.
- Keep cards information-dense but not cramped. Put customer/job identity before metadata.
- Provide explicit empty, loading, error, offline, reconnecting, and read-only presentations.
- Keep destructive actions visually and spatially distinct from routine actions.

## Kanban behavior

- Display lane names and counts persistently.
- Show allowed status transitions rather than allowing arbitrary invalid movement.
- Provide drag handles so links and form controls inside cards remain usable.
- Provide a non-drag alternative for keyboard and mobile users.
- Confirm consequential status changes and explain failures with recovery guidance.
- Preserve optimistic updates only when rollback is reliable.

## Interaction and accessibility

- Meet WCAG 2.2 AA contrast.
- Show visible `focus-visible` treatment using brand blue.
- Support keyboard, pointer, and touch for every workflow.
- Use semantic elements and labels before ARIA workarounds.
- Respect reduced-motion preferences.
- Avoid ambiguous labels such as `Submit`, `Continue`, or icon-only actions without accessible names.

## Voice

Write concise, confident, helpful, low-jargon copy.

- Prefer `Create job`, `Assign technician`, and `Move to En route`.
- Explain what happened and what the user can do next.
- Avoid hype, blame, jokes during failure states, and internal implementation language.

## Quality gates

- Brand colors come from semantic tokens.
- Logo variant and background follow these rules.
- Responsive behavior is verified at mobile and desktop widths.
- Interactive controls have all relevant states and accessible names.
- Keyboard-only completion is possible.
- Touch targets meet the minimum size on mobile.
- Empty, loading, error, offline, and read-only states are considered.
- No new teal/purple brand usage or decorative status colors are introduced.
- Representative screenshots show the result in context.
