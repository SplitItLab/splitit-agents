---
name: frontend-atomic-refactor
description: Refactor an existing frontend in place into atomic, reusable components with centralized typography, UI copy, and global design tokens while preserving its current visual design and behavior. Use when asked to remove hardcoded UI values or magic numbers, standardize styles and text, improve responsiveness, or componentize an existing frontend; do not use to invent or redesign the interface.
---

# Frontend Atomic Refactor

Refactor the entire frontend into a maintainable design system derived from the code that already exists. Finish all routes and shared UI in scope; do not leave the application half migrated.

## Non-negotiable contract

- Treat the currently rendered frontend as the visual source of truth. Preserve its colors, typography, spacing, hierarchy, assets, copy, states, interactions, and desktop composition.
- Do not invent a new design, add visual flourishes, replace the component library, rewrite product copy, or “improve” aesthetics.
- Responsive work may only reflow, wrap, stack, resize, or scroll the existing content. It must reuse the same visual language and must not introduce a different mobile design.
- Preserve behavior, accessibility, test selectors, routes, data flow, and public component APIs unless a change is necessary for the refactor and all callers are migrated.
- Refactor application-owned frontend code, including copied UI primitives. Do not edit dependencies, generated output, backend code, or unrelated infrastructure.
- Respect repository instructions and user changes. In this repository, read `web/AGENTS.md` and the relevant documentation under `web/node_modules/next/dist/docs/` before changing Next.js code.

## Establish a baseline before editing

1. Locate the frontend root, package manager, routes, layouts, component library, global styles, tests, and existing screenshot tooling.
2. Inspect every application-owned frontend source file, not only the first route mentioned by the user.
3. Inventory:
   - repeated visual values and arbitrary Tailwind utilities;
   - inline styles and raw colors;
   - existing typography combinations;
   - visible strings, placeholders, labels, accessibility text, validation messages, toasts, and metadata;
   - embedded sample data and display-formatting logic;
   - repeated JSX structures and current responsive behavior;
   - server/client component boundaries.
4. Capture the current UI before refactoring. Prefer the repository's `frontend-screenshots` workflow when available, and also cover routes or important states it omits. Keep temporary baselines out of version control.
5. Record pre-existing visual or responsive defects so they are not confused with regressions.

Do not begin by choosing a new token scale or a generic component catalog. Derive both from the observed frontend.

## Classify literals correctly

Use the following destination for each kind of literal:

| Literal kind | Destination |
| --- | --- |
| Color, spacing, size, radius, shadow, font metric, breakpoint, opacity, duration, layer, or other visual measurement | Semantic custom property in the global stylesheet, exposed through the project's styling system when needed |
| Static user-facing copy | Typed module under the frontend's `content/` directory |
| Repeated route, asset path, locale, or formatting option | Named TypeScript configuration or constant |
| Mock, seed, or example records rendered by a page | Typed fixture/data module outside the component |
| Business rule, validation limit, timeout, or other non-visual number | Named TypeScript constant near its domain, never a CSS variable |
| Runtime/API value | Keep as data; format or validate it at the boundary |
| Truly dynamic visual value, such as progress computed from data | Pass through a typed component prop and a documented CSS custom-property interface |

Do not extract import paths, object keys, HTML attribute values, form field names, discriminated-union values, or one-off implementation syntax merely to claim that no string literals remain. They are not user-facing copy or magic design values.

Values such as `0`, `100%`, `currentColor`, an array index, or a flex growth factor are not automatically magic. Keep them inline only when their meaning is intrinsic and immediately clear. If a value encodes a design decision, centralize it.

## Build tokens from the existing design

Use the frontend's global stylesheet as the sole source of raw visual values. In SplitIt this is `web/app/globals.css`.

- Preserve the existing shadcn and Tailwind theme variables and extend them rather than creating a parallel theme.
- Group project tokens by role: semantic colors, typography, spacing, component sizing, radii, shadows, breakpoints, layers, and motion. Add only groups that the current UI actually uses.
- Name tokens by purpose, such as page background or section gap, rather than by the raw value or a particular page.
- Expose tokens through the correct Tailwind 4 `@theme` namespace when semantic utility classes are useful. Verify the installed Tailwind/Next.js documentation instead of relying on remembered syntax.
- Replace raw palette classes, arbitrary bracket values, inline static styles, and unexplained utility-scale choices with semantic token-backed classes or component variants.
- Raw visual values may appear in the global token definitions. Component CSS and TSX must consume tokens rather than repeat those values.
- If two existing values are close but not identical, preserve both initially with distinct semantic names. Consolidate them only when evidence shows they represent the same role and the rendered result remains unchanged.
- Do not create speculative tokens that have no current consumer.
- Keep light/dark values aligned with existing behavior. Do not introduce a new theme mode.

When a visual value is data-dependent, set only a named CSS custom property from React and consume it in CSS. Do not use `style` for static design values. Validate or clamp untrusted numeric values before exposing them to CSS.

## Create and adopt `Typography`

Create the shared component at the atom/UI-primitive layer, normally `web/components/ui/typography.tsx` in this repository.

- Derive its variants from typography combinations already present in the rendered UI. Use semantic variant names; do not invent additional type styles.
- Separate semantic markup from visual appearance. Support an `as` or equivalent prop so a heading can retain the correct `h1`–`h6`, `p`, `span`, or other appropriate element independently of its visual variant.
- Keep the API typed and small. A `variant` plus semantic element and narrowly scoped contextual options are preferable to independent font-size, weight, line-height, color, and tracking props.
- Each variant must resolve to global typography and color tokens. Call sites must not override font family, size, weight, tracking, or line-height through `className`.
- Preserve accessible heading order and native semantics.
- Replace standalone headings, paragraphs, captions, amounts, helper text, and status text with `Typography` throughout the frontend.
- Components with intrinsic text semantics, such as `Button`, `Badge`, `Label`, `Input`, and `FieldError`, remain atoms and do not need invalid or redundant nested markup. Their own text styling must still consume the same global typography tokens.

## Centralize UI copy without adding an i18n system

Create typed content modules, normally under `web/content/`, organized by shared copy and feature or route.

- Move exact existing visible copy, placeholders, labels, empty states, toast messages, validation copy, metadata, and accessibility labels into those modules.
- Preserve spelling, punctuation, capitalization, and language unless the user explicitly requests copy edits.
- Use small formatter functions for interpolated phrases and accessibility labels instead of concatenating fragments inside JSX.
- Keep backend-provided messages and runtime user content as runtime data. Do not duplicate them in the content catalog.
- Do not install an internationalization dependency unless localization was separately requested.
- Pass content into presentational components as typed props when that keeps the component reusable. Do not make every atom import a route-specific content file.

The copy catalog owns words; `Typography` owns how standalone text is rendered. These are separate responsibilities.

## Apply atomic component architecture

Use the smallest hierarchy that represents real responsibilities:

```text
web/components/
├── ui/          # design-system primitives; counts as the atom layer
├── atoms/       # app-specific atoms only when ui/ is not the right home
├── molecules/   # small combinations with one clear job
├── organisms/   # complete sections composed from atoms and molecules
└── templates/   # page-level layout and responsive composition
```

Feature subfolders are acceptable when they improve discovery, but keep the atomic level clear. Do not move stable shadcn primitives solely to satisfy a folder diagram.

- Start with tokens and atoms, then migrate molecules, organisms, templates, and pages.
- A page should primarily obtain data, bind handlers, and compose a template or organisms. Large presentational JSX blocks do not belong in the route file.
- Extract a component when it is reused, has a distinct responsibility, owns a state or accessibility boundary, or makes a larger composition materially easier to understand. Do not create meaningless one-line wrappers.
- Give components semantic, domain-oriented props. Avoid APIs that accept arbitrary collections of classes to reconstruct the old hardcoding at the call site.
- Keep state and effects at the lowest sensible owner. Push `"use client"` boundaries down so purely presentational components can remain server-compatible.
- Keep render data out of component bodies when it is static. Put it in typed content, configuration, or fixture modules according to its meaning.
- Reuse the existing UI primitives and utilities before adding overlapping abstractions.

Migrate route by route in vertical slices, but continue until all application-owned frontend routes and shared components pass the completion gates.

## Make the existing design responsive

- Work mobile first and prefer flexbox for one-dimensional layouts, alignment, wrapping, and ordered reflow.
- Use CSS Grid only when the current design is genuinely two-dimensional or grid preserves the existing composition more faithfully. Do not replace a suitable grid with fragile flex calculations merely to avoid Grid.
- Prefer `flex-wrap`, `gap`, `flex-basis`, `min-width: 0`, semantic max-width tokens, and stacking at existing breakpoints over absolute positioning or duplicated markup.
- Fixed dimensions are allowed only when the current design requires them, and their raw values must be global tokens.
- Avoid horizontal overflow at narrow widths. Preserve readable line lengths, tap targets, form usability, image behavior, and keyboard navigation.
- Test at least the project's existing desktop and mobile screenshot sizes plus narrow mobile and intermediate tablet widths. For SplitIt, include the configured `1440x900` and `390x844` viewports.

## Prevent the hardcoding from returning

Use the existing lint/tooling stack to add an enforceable project-local guard when it can be precise. Prefer AST-aware ESLint rules or a small deterministic audit script over a broad regular expression that produces false positives.

The guard should inspect application-owned frontend source and reject, with a narrow documented allowlist when necessary:

- raw color literals in TS, TSX, JSX, or component-local styles;
- static inline visual styles;
- arbitrary numeric Tailwind values and raw palette utilities that bypass semantic tokens;
- direct standalone text nodes and user-facing JSX attribute strings outside approved content or primitive boundaries;
- newly introduced visual measurements outside the global stylesheet.

Exclude dependencies, generated files, snapshots, tests whose literals are assertions, and the global token definitions themselves. Every allowlist entry must state why the value is intrinsic, generated, or otherwise not a design magic number. Wire a reliable guard into the existing lint or CI command; do not weaken or replace the repository's current checks.

Even when an automatic guard cannot cover every copy case safely, perform a final manual/AST-assisted inventory. The absence of an ideal lint rule is not permission to leave hardcoded UI values behind.

## Validation and completion gates

Run the repository's formatter, linter, type check when available, unit tests, production build, and relevant browser tests. Then compare before/after screenshots and DOM snapshots for every route and important state.

The refactor is complete only when:

- all frontend routes and shared application components were reviewed and migrated;
- there is no intentional desktop visual difference;
- mobile differences are limited to necessary responsive reflow using the current design language;
- all raw visual design values live in the global stylesheet and consumers use semantic tokens;
- standalone text consistently uses `Typography` and retains correct HTML semantics;
- static UI copy and display fixtures no longer live inside render functions;
- atomic boundaries reduce duplication without producing trivial wrapper noise;
- no new hydration, accessibility, interaction, console, lint, type, test, or build errors exist;
- the hardcoding guard passes, or any unavoidable gap and its exact manual audit are reported;
- generated baselines and other temporary artifacts are not committed.

If a browser, backend, authentication state, or sandbox limitation prevents a check, complete every other safe check and report the exact unverified route or state. Do not claim visual equivalence without evidence.

In the final handoff, summarize the token groups, typography variants, content modules, atomic component map, responsive behavior, automated guard, checks run, and any explicit exceptions. State clearly that no new design was introduced, or identify any unavoidable visual delta instead of hiding it.
