# Issue 01: Fix Member Download And Code CTAs

Severity: P1
Score impact: raises CTA effectiveness and download/register placement from `2` toward `4`
Linked audit section: Prioritized Issues, SEO Opportunity Map

## Current Evidence

- App Store badges are now rendered from `Backend/GreekGeekApi/templates/partials/app_store_badge.html`, so the final product URL can be inserted in one place.
- The member CTA now presents App Store download plus chapter-code joining instead of `Register with code`.
- Desktop and mobile screenshots show the App Store badge above the fold, so this placeholder is one of the first conversion signals.

## Why It Hurts

This creates a trust problem. The page visually promises that the app can be downloaded, but the click only scrolls to a note saying the flow is not ready. Members with a code cannot complete the promised action, and organization buyers may question whether launch infrastructure is ready.

Apple's App Store badge guidance treats the badge as a clear call to action to get the app and points developers to generated App Store product links. GreekHours, Greeky, and App Store listings use platform badges only where the app availability path is explicit.

Sources:

- [Apple App Store Marketing Guidelines](https://developer.apple.com/app-store/marketing/guidelines/)
- [GreekHours website](https://greekhours.com/)
- [GreekHours App Store listing](https://apps.apple.com/us/app/greekhours/id6758505889)
- [Greeky](https://www.greeky.app/)

## Remediation Plan

1. Treat the App Store as the current member distribution path:
   - Keep App Store badges in the hero, member section, footer, and final CTA.
   - Centralize the badge markup/href so the final App Store product URL can be swapped in once available.
2. Replace the old member-code placeholder with App Store and chapter-code copy:
   - `Download GreekGeek from the App Store`
   - `Join with your chapter code`
   - `No code? Ask your chapter admin or start an organization trial.`
3. Keep one primary buyer CTA above the fold and one clearly subordinate member path.
4. Add a concise member access block:
   - `Already have a code? Download GreekGeek and choose Join organization.`
   - `No code? Ask your chapter admin or register your organization.`
5. Update click tracking event names so they reflect real actions: `app_store_clicked`, `testflight_clicked`, `member_waitlist_clicked`, or `member_code_help_clicked`.

## Likely Files

- `Backend/GreekGeekApi/templates/landing.html`
- `Backend/GreekGeekApi/templates/base.html`
- `Backend/GreekGeekApi/static/js/auth.js` if tracking events are formalized
- Static app badge assets only if the current app availability state supports them

## Suggested Copy

If App Store is treated as live:

```text
For members
Have an organization code?
Download GreekGeek from the App Store, choose Join organization, and enter the code from your chapter admin.
```

CTA options:

```text
Download on the App Store
Register your organization
```

If App Store is live:

```text
Already have a chapter code?
Download GreekGeek, choose "Join organization," and enter the code from your chapter admin.
```

## Acceptance Criteria

- App Store badges appear as live download CTAs.
- The final App Store product URL can be added in one include instead of editing every landing-page placement.
- The old member-code placeholder is replaced by App Store and chapter-code copy.
- Footer member CTA matches the hero state.
- Desktop and mobile screenshots show one clear organization CTA and one truthful member path.
- Playwright click checks confirm all visible app/member CTAs lead to their intended destination.
