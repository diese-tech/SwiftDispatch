---
name: swiftdispatch-design
description: Apply and maintain the SwiftDispatch brand and product design system. Use when creating, refactoring, reviewing, or documenting SwiftDispatch marketing pages, authenticated workflows, Tailwind/React components, navigation, Kanban interactions, logos, design tokens, responsive behavior, accessibility, or UX copy.
---

# SwiftDispatch Design

Create calm, fast, dependable interfaces for HVAC dispatch teams. Favor operational clarity over novelty and keep marketing and product surfaces recognizably part of one brand.

## Required reference

Read [references/brand-system.md](references/brand-system.md) completely before making visual or interaction decisions. Use the approved files in `assets/` when producing branded artifacts.

## Workflow

1. Identify whether the surface is marketing, authentication, or an operational workspace.
2. Preserve existing behavior, data boundaries, routes, and accessibility unless the request explicitly changes them.
3. Audit nearby components and tokens before introducing a new pattern.
4. Apply semantic tokens and shared component variants before local utility overrides.
5. Define default, hover, focus-visible, active, disabled, loading, empty, error, offline, and read-only states where relevant.
6. Verify keyboard, pointer, and touch behavior. Never make drag-and-drop the only way to complete an action.
7. Check responsive layout, long content, overflow, contrast, and reduced-motion behavior.
8. Run the repository's type check, tests, production build, and browser screenshot checks in proportion to the change.

## Implementation rules

- Keep Tailwind as the styling system. Treat each React component as the structural boundary that BEM would call a block.
- Do not add parallel BEM styles for components already expressed with Tailwind.
- Extract repeated visual and interaction patterns into components or named variants.
- Prefer CSS custom properties for brand and semantic tokens; do not scatter raw brand colors through JSX.
- Use blue for brand and primary interaction, navy for authority and text, and orange only for the highest-priority conversion or urgency accent.
- Reserve green, amber, and red for operational meaning.
- Use motion to explain state changes, not as decoration.
- Use semantic HTML before ARIA and write specific accessible names.

## Design review output

When reviewing an implementation, report:

1. Brand-system conflicts
2. Usability and accessibility issues
3. Repeated patterns that should become shared components
4. The smallest safe migration sequence
5. Testable acceptance criteria

Do not claim visual consistency from token changes alone. Inspect representative marketing, authentication, desktop workspace, and mobile states.
