# Issue 05: Tighten The Mobile Scan Path

Severity: P2
Score impact: raises mobile formatting and CTA effectiveness from `3` toward `4`
Linked audit section: Scorecard, Evidence Collected

## Current Evidence

- Mobile first viewport (`mobile-390x844-viewport.png`) shows the brand, hamburger, H1, hero copy, primary CTA, App Store badge, and sign-in link. This is readable and mostly effective.
- Mobile menu (`mobile-menu-open.png`) expands inline and pushes the hero down rather than presenting a compact action area.
- Mobile full-page screenshot (`mobile-390x844-full-loaded.png`) stacks multiple large phone screenshots between short copy blocks. It is visually credible but long.
- The member section should make the App Store download path and chapter-code join flow immediately clear.
- `Backend/GreekGeekApi/static/css/main.css:639-720` stacks the page cleanly, but does not add mobile-specific summary/proof compression or a sticky action.

## Why It Hurts

Mobile buyers can understand the hero, but evaluating the product takes many scrolls. Because the secondary member path is a placeholder, the long screenshot-heavy mobile layout does not pay off with a clear action. On mobile, a chapter officer should be able to answer three questions quickly: what does it do, how do members join, and how does an admin start?

Competitor pages in this niche use short workflow sections, immediate availability/pricing cues, and repeated clear CTAs. GreekGeek should preserve the real screenshots while making the mobile decision path denser.

Sources:

- [GreekHours](https://greekhours.com/)
- [CampusStudy](https://campusstudy.app/)
- [Greeky](https://www.greeky.app/)

## Remediation Plan

1. Keep the hero as the main mobile first viewport, with the App Store badge visible above the fold.
2. Add a compact mobile proof strip immediately after hero:
   - `Verified study sessions`
   - `Member codes`
   - `Admin reports`
3. Compress the mobile workflow:
   - show one screenshot at a time or use smaller paired screenshot cards,
   - reduce repeated vertical gaps,
   - keep copy and screenshot in the same viewport where practical.
4. Add a mobile-specific organization CTA after the problem panel and after admin experience.
5. Make the mobile menu include the primary CTA as a visually distinct button, not just a nav link.
6. Avoid a sticky CTA until the destination and member path are truthful. Once fixed, consider a bottom action bar only if it does not cover content.

## Likely Files

- `Backend/GreekGeekApi/templates/landing.html`
- `Backend/GreekGeekApi/templates/base.html`
- `Backend/GreekGeekApi/static/css/main.css`

## Suggested Mobile Section Direction

After hero:

```text
Built for chapter study accountability
Verified locations | Member codes | Admin reports
```

After the problem panel:

```text
Ready to run one study period?
[Request chapter access]
```

Mobile menu CTA:

```text
Request chapter access
Sign in
```

## Acceptance Criteria

- Mobile `390x844` screenshot shows the hero, primary CTA, and a truthful secondary path without misleading App Store treatment.
- Within two mobile scrolls, users see problem, key product proof, and another organization CTA.
- Mobile menu open state shows a clearly styled primary CTA.
- No horizontal scroll, clipped text, or overlapped screenshots at `390x844`.
- Full-page mobile screenshot remains product-rich but shorter and easier to scan.
