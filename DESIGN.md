---
version: alpha
name: GreekGeek Chapter Operations
description: A premium mobile-first study operations system for members and organization administrators, optimized for fast clock-in, location confidence, progress clarity, and admin follow-through.
colors:
  primary: "#16A34A"
  on-primary: "#FFFFFF"
  primary-pressed: "#15803D"
  primary-container: "#DCFCE7"
  on-primary-container: "#14532D"
  primary-soft: "#F0FDF4"
  primary-border: "#BBF7D0"
  secondary: "#2563EB"
  on-secondary: "#FFFFFF"
  secondary-container: "#DBEAFE"
  on-secondary-container: "#1E3A8A"
  tertiary: "#111827"
  on-tertiary: "#FFFFFF"
  background: "#F8FAFC"
  on-background: "#111827"
  surface: "#FFFFFF"
  on-surface: "#111827"
  surface-container-lowest: "#FFFFFF"
  surface-container-low: "#F9FAFB"
  surface-container: "#F3F4F6"
  surface-container-high: "#E5E7EB"
  surface-container-highest: "#D1D5DB"
  surface-variant: "#F3F4F6"
  on-surface-variant: "#4B5563"
  outline: "#D1D5DB"
  outline-variant: "#E5E7EB"
  muted: "#6B7280"
  muted-light: "#9CA3AF"
  focus-ring: "#86EFAC"
  success: "#16A34A"
  on-success: "#FFFFFF"
  success-container: "#ECFDF5"
  on-success-container: "#166534"
  live: "#EF4444"
  on-live: "#FFFFFF"
  warning: "#D97706"
  on-warning: "#FFFFFF"
  warning-container: "#FFFBEB"
  on-warning-container: "#92400E"
  error: "#DC2626"
  on-error: "#FFFFFF"
  error-container: "#FEF2F2"
  on-error-container: "#991B1B"
  info: "#2563EB"
  on-info: "#FFFFFF"
  info-container: "#EFF6FF"
  on-info-container: "#1D4ED8"
  admin-bar: "#16A34A"
  admin-bar-pressed: "#15803D"
  map-accent: "#16A34A"
  map-accent-fill: "#DCFCE7"
  map-neutral: "#111827"
  chart-1: "#16A34A"
  chart-2: "#2563EB"
  chart-3: "#D97706"
  chart-4: "#6B7280"
typography:
  hero-title:
    fontFamily: Poppins
    fontSize: 30px
    fontWeight: 600
    lineHeight: 38px
    letterSpacing: 0em
  screen-title:
    fontFamily: Poppins
    fontSize: 22px
    fontWeight: 600
    lineHeight: 30px
    letterSpacing: 0em
  section-title:
    fontFamily: Poppins
    fontSize: 17px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0em
  title-md:
    fontFamily: Poppins
    fontSize: 16px
    fontWeight: 600
    lineHeight: 23px
    letterSpacing: 0em
  body-lg:
    fontFamily: Poppins
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Poppins
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Poppins
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0em
  data-xl:
    fontFamily: Poppins
    fontSize: 36px
    fontWeight: 600
    lineHeight: 42px
    letterSpacing: 0em
  data-lg:
    fontFamily: Poppins
    fontSize: 28px
    fontWeight: 600
    lineHeight: 34px
    letterSpacing: 0em
  data-md:
    fontFamily: Poppins
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: 0em
  label-lg:
    fontFamily: Poppins
    fontSize: 16px
    fontWeight: 600
    lineHeight: 22px
    letterSpacing: 0em
  label-md:
    fontFamily: Poppins
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0em
  label-sm:
    fontFamily: Poppins
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0em
  label-caps:
    fontFamily: Poppins
    fontSize: 11px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.04em
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  screen-margin: 16px
  screen-top: 12px
  card-padding: 16px
  card-gap: 14px
  section-gap: 24px
  row-padding: 14px
  row-min-height: 64px
  compact-row-min-height: 52px
  touch-target: 44px
  button-height: 56px
  input-height: 56px
  tab-bar-height: 60px
  admin-header-height: 88px
  bottom-sheet-padding: 20px
  map-aspect-ratio-width: 16
  map-aspect-ratio-height: 10
rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  full: 9999px
radii:
  card: "{rounded.lg}"
  panel: "{rounded.lg}"
  button: "{rounded.md}"
  input: "{rounded.md}"
  row: "{rounded.md}"
  chip: "{rounded.full}"
  modal-sheet: "{rounded.xxl}"
  avatar: "{rounded.full}"
borders:
  hairline: 1px
  standard: 1px
  emphasized: 2px
shadows:
  none: "0 0 0 rgba(0,0,0,0)"
  card: "0 1px 3px rgba(17,24,39,0.08)"
  raised: "0 4px 12px rgba(17,24,39,0.10)"
  sheet: "0 -8px 24px rgba(17,24,39,0.16)"
elevation:
  base:
    backgroundColor: "{colors.background}"
    shadow: "{shadows.none}"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.outline-variant}"
    shadow: "{shadows.card}"
  raised-card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.outline-variant}"
    shadow: "{shadows.raised}"
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    shadow: "{shadows.sheet}"
motion:
  duration-fast: 120ms
  duration-standard: 180ms
  duration-slow: 260ms
  easing-standard: ease-in-out
  easing-enter: ease-out
  easing-exit: ease-in
icons:
  style: line
  stroke-width: 2px
  size-sm: 18px
  size-md: 20px
  size-lg: 24px
  size-xl: 34px
components:
  screen-shell:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-background}"
    padding: "{spacing.screen-margin}"
  top-app-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.title-md}"
    height: 64px
    padding: "12px 16px"
  admin-app-bar:
    backgroundColor: "{colors.admin-bar}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-md}"
    height: "{spacing.admin-header-height}"
    padding: "12px 16px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: "{spacing.button-height}"
    padding: "0 16px"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.on-primary}"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: "{spacing.button-height}"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  status-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
  progress-meter:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    height: 8px
  map-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 0px
    size: "16:10"
  status-callout-success:
    backgroundColor: "{colors.success-container}"
    textColor: "{colors.on-success-container}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  status-callout-warning:
    backgroundColor: "{colors.warning-container}"
    textColor: "{colors.on-warning-container}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  status-callout-error:
    backgroundColor: "{colors.error-container}"
    textColor: "{colors.on-error-container}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: "{spacing.input-height}"
    padding: "0 16px"
  input-field-error:
    backgroundColor: "{colors.error-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    height: "{spacing.input-height}"
  segmented-control:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs}"
  segmented-control-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  chip:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  chip-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.on-success-container}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  navigation-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: "{spacing.row-min-height}"
    padding: "{spacing.row-padding}"
  admin-navigation-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: "{spacing.row-min-height}"
    padding: "{spacing.row-padding}"
  setup-checklist-row:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: "{spacing.compact-row-min-height}"
    padding: "{spacing.md}"
  empty-state:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xxl}"
    padding: "{spacing.bottom-sheet-padding}"
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    height: "{spacing.tab-bar-height}"
---

## Overview

GreekGeek should feel like the command center for a chapter’s study obligations: calm, trustworthy, fast, and precise. The product is not a playful habit app and not a marketing site. It is a mobile operations tool for students who need to clock study sessions with confidence and officers who need to know, at a glance, whether the chapter is on track.

The upgraded design direction is **premium academic operations**: editorially clean, compact, highly legible, and intentionally restrained. Every screen should answer the user’s next question before they have to ask it. Members should know: Am I studying? Am I in the right place? How much time do I need? What happens next? Admins should know: Is setup complete? Who is behind? What needs attention today?

The interface should create confidence through clarity. Use one obvious primary action per screen, persistent status context, strong empty states, clear progress summaries, and list-based admin workflows. Remove decorative bulk. Replace raw forms and oversized cards with guided steps, useful rows, and compact panels.

## Colors

The core palette is white, off-white, charcoal, and GreekGeek green. Green is not a background theme; it is a signal. Use it for primary actions, verified states, active navigation, completed checklist items, and meaningful progress. Do not use several large green surfaces on the same screen.

Charcoal and near-black carry the product’s authority. Headings, data, icons, and row labels should be high-contrast. Muted gray supports captions, metadata, secondary descriptions, empty states, borders, and inactive navigation.

Blue is secondary and restrained. Use it for links, report filters, map-adjacent information, and secondary analytics accents. Amber is for setup warnings, approaching deadlines, or being outside an approved area. Red is reserved for destructive actions, blocked permissions, maintenance, clock-out danger states, and failed validation.

The product should never read as a one-note green app. Most of the screen should be neutral; green should make the important thing obvious.

## Typography

Use Poppins as the only typeface. The system should feel polished because hierarchy is exact, not because type is large. Screen titles sit around 22px. Section headers sit around 17px. Body text uses 14-16px. Metadata and captions use 12px. Major numbers may scale to 28-36px, but only when they are central to the current task.

Use semibold for titles, buttons, important data, row labels, and status titles. Use regular weight for explanatory copy. Labels may be uppercase only when they are short status markers such as "Study status" or "Current period"; do not turn forms, sections, or navigation into all-caps.

All letter spacing should remain neutral except small status labels. Avoid negative tracking. Avoid font-size jumps inside compact panels. A dense admin row should use smaller, tighter type than a Study status hero.

## Layout

Use a mobile-first 4px/8px spacing rhythm. Default screen margin is 16px. Default card padding is 16px. Default card gaps are 14-16px. Every screen should follow a clear information order and avoid burying the next action below decorative content.

Study flow order:
1. Current status and active session state.
2. Period progress: required, completed, remaining, deadline.
3. One primary clock action.
4. Location confidence state.
5. Approved-area map with chips.
6. Secondary actions such as manual time or admin access.

Auth flow order:
1. Small brand mark.
2. Screen-specific purpose.
3. One guided form card.
4. Primary submit action.
5. Secondary account switch link.

Admin flow order:
1. High-level setup and operational status.
2. Checklist or metrics that reveal what is incomplete.
3. Navigation rows grouped by Organization, People, Study Rules, Reporting, and Settings.
4. Contextual help only where it supports the current task.

Prefer rows over cards when the user is scanning a list. Use cards only for status panels, maps, summaries, modals, and genuinely grouped controls. Do not place large stacked cards at the top of the screen unless each one answers a different mission-critical question.

## Elevation & Depth

Depth should be quiet and utilitarian. The base canvas is off-white. Primary content sits on white surfaces with 1px borders and soft shadows. Shadows should be barely visible and never become the main design language.

Use depth to explain hierarchy:
- Base layer: page canvas.
- Card layer: status panels, maps, summaries, forms.
- Raised layer: active modal sheets, confirmation panels, focused editors.

Avoid glass effects, heavy drop shadows, colorful gradients, or ornamental depth. Admin screens especially should rely on structure, section labels, and compact rows rather than shadow-heavy cards.

## Shapes

Shapes are crisp and modern. Cards and panels use 12px corners. Buttons, inputs, rows, and segmented controls use 8px corners. Bottom sheets use 24px top corners. Full rounding is reserved for avatars, icon wells, live dots, chips, badges, and circular map controls.

Do not make every element pill-shaped. Repeated operational rows should feel structured. A rounded chip should signal selection or filtering. A rounded icon well should help quick scanning, not act as decoration.

## Components

### Study Status Panel

The Study status panel is the product’s most important component. It must show state, place, progress, and the primary clock action in one compact module. "Ready to study" and "Studying at [location]" should be impossible to miss. The panel must not use a large decorative clock circle unless the timer is actively running and the surrounding panel still includes progress and location context.

### Location Map Panel

The map is a stable 16:10 panel with visible boundaries, markers, and user location. The approved-area fill should be subtle enough that the map remains readable. Always show a location state above or inside the map module: in area, outside all areas, nearest area and distance, permissions needed, verification disabled, or no areas configured. Location chips belong directly below the map.

### Progress Summary

Progress must answer: completed, required, remaining, and deadline. A tiny percent-only bar is not enough. In Study, progress belongs near the top. In History, progress becomes a period summary. In Reports, progress becomes aggregate analytics with sortable rows.

### Auth Forms

Auth should feel guided, not raw. Registration is a two-step journey: find organization, then create account. The organization match appears as a compact confirmation row with a "Change" action. Validation errors sit directly under the relevant field and use plain language. Do not bottom-anchor the primary actions on mostly empty screens.

### Profile

Profile is an account control surface, not a personal landing page. Use a compact header with identity, organization, role, group, and live status. Group actions under Account, Organization, Notifications, Support, and Legal. Sign out is a normal row. Delete account is visually separated and red, but not oversized.

### Admin Dashboard

The admin dashboard should be a compact operational home, not a menu of oversized cards. It needs a setup checklist and daily status widgets before navigation. Recommended widgets: active study areas, current period requirement, users behind target, live users, and setup completeness. Navigation rows should include an icon, label, key metric or short description, and chevron.

### History

History starts with the relevant period, not a duplicate of Study. Show "Current period" or selected scope, required hours, completed hours, deadline, and a compact timeline. Empty state should say what will appear and offer a direct path to Study.

### Leaderboard

Leaderboard uses ranked rows, not sparse cards. Each row includes rank, avatar initials, name, group, hours, and live badge. Use a segmented control for Individual and Groups. Highlight "You" with a subtle outline, not a dominant green block. Explain zero-hour ranking states clearly.

### Reports

Reports should feel like a mobile analytics surface, not a cramped spreadsheet. Start with scope selector: Current Period, Previous Period, Lifetime. Then show top metrics: total hours, completion rate, users behind, active locations. Use sticky tabs for Users, Groups, Locations, and replace dense tables with sortable rows.

### Empty States

Every empty state should be useful. State what is missing, why it matters, and the next action. Examples: no approved study areas, no sessions yet, no groups, no users behind target, no report data for selected scope. Empty states should not look like errors unless the user is blocked.

## Do's and Don'ts

- Do design for the user’s next decision: clock in, find location, see progress, fix setup, or inspect exceptions.
- Do make one primary action visually dominant per screen.
- Do keep the Study screen status-first, with progress and location visible before secondary actions.
- Do make the map readable with visible geography, boundaries, marker, user position, and location chips.
- Do turn admin pages into operational dashboards with metrics, setup checklists, filters, and useful row metadata.
- Do use segmented controls for scope changes such as period, individual/group, and report category.
- Do use compact timeline rows for History and ranked rows for Leaderboard.
- Do provide action-oriented empty states.
- Do write UI copy that is calm, plain, and operational.
- Don't use competing colored cards for admin, locations, and manual entry at the top of Study.
- Don't let progress appear as a tiny unlabeled percent-only bar.
- Don't show maps as cropped strips or flat color blocks.
- Don't bury account actions inside unrelated organization sections.
- Don't use placeholder copy, joke copy, raw test labels, or unexplained fake data.
- Don't make every admin destination an oversized card.
- Don't use gradients, decorative blobs, glassmorphism, bokeh, or illustration-heavy layouts inside the signed-in product.
- Don't build onboarding before the final UI is stable; onboarding must explain the finished workflow, not compensate for unclear screens.
