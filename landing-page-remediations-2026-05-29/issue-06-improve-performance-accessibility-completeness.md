# Issue 06: Improve Performance, Accessibility, And Completeness Polish

Severity: P2
Score impact: raises performance/accessibility and completeness from `3` toward `4`
Linked audit section: Evidence Collected, Scorecard

## Current Evidence

- `/favicon.ico` returns 404 during Playwright load.
- Product screenshot assets under `Backend/GreekGeekApi/static/screenshots/landing/` total about 4.4 MB.
- The page loads Bootstrap and Font Awesome from external CDNs in `Backend/GreekGeekApi/templates/base.html:12` and `Backend/GreekGeekApi/templates/base.html:85-86`.
- Mobile hamburger button in `Backend/GreekGeekApi/templates/base.html:23` has no explicit `aria-label`.
- The visible App Store badge anchor is accessible by `aria-label`, and product screenshots have descriptive alt text, which is good.
- The first full-page screenshot pass did not load below-fold lazy images until the page was scrolled. Real user scrolling loads them, but verification needs an explicit scroll pass.

## Why It Hurts

These are not the main conversion blockers, but they affect polish and perceived reliability. A missing favicon is a visible launch-detail miss. Large image payloads slow mobile pages. CDN dependency can delay rendering or fail in privacy-restricted environments. An unlabeled hamburger button is avoidable accessibility debt.

Google's SEO guidance emphasizes high-quality images near relevant text and useful alt text; the page already uses product images well, so the next step is optimizing delivery and launch completeness.

Sources:

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)

## Remediation Plan

1. Add favicon/icon assets:
   - `favicon.ico` or PNG/SVG favicon links,
   - Apple touch icon if appropriate.
2. Compress and resize landing screenshots:
   - generate WebP/AVIF or optimized PNG variants,
   - provide smaller mobile sizes,
   - use `srcset` and `sizes` for phone screenshots.
3. Keep hero images prioritized and lazy-load below-fold images, but verify with a scroll pass.
4. Add `aria-label="Toggle navigation"` to the hamburger button.
5. Consider self-hosting Bootstrap/Font Awesome or removing Font Awesome from pages that only use two nav icons.
6. Add resource hints or local assets only if measurement shows a need.
7. Add a repeatable link/asset check for launch:
   - `/`,
   - `/register/`,
   - `/login/`,
   - `/privacy/`,
   - `/terms/`,
   - favicon,
   - CSS,
   - social image,
   - app/download destinations.

## Likely Files

- `Backend/GreekGeekApi/templates/base.html`
- `Backend/GreekGeekApi/static/css/main.css`
- `Backend/GreekGeekApi/static/img/`
- `Backend/GreekGeekApi/static/screenshots/landing/`

## Suggested Markup

```html
<link rel="icon" href="{% static 'img/favicon.ico' %}">
<link rel="apple-touch-icon" href="{% static 'img/apple-touch-icon.png' %}">
```

```html
<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-label="Toggle navigation">
```

## Acceptance Criteria

- `/favicon.ico` or configured favicon URL returns 200.
- Screenshot payload is materially smaller than 4.4 MB without visible quality loss.
- `390x844` and `1440x900` screenshots show no layout shift, clipping, or horizontal scroll.
- Hamburger button has an accessible name in Playwright accessibility snapshot.
- CDN failures do not remove critical navigation actions or icons, or dependencies are self-hosted.
- Link/asset smoke check returns 200 for all expected launch URLs.
