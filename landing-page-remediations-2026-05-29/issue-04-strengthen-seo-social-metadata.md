# Issue 04: Strengthen SEO And Social Metadata

Severity: P2
Score impact: raises SEO/search intent from `2` toward `4`
Linked audit section: SEO Opportunity Map

## Current Evidence

- Title and meta description are present in `Backend/GreekGeekApi/templates/landing.html:4-7`.
- Base metadata includes `og:title`, `og:description`, and `og:type` in `Backend/GreekGeekApi/templates/base.html:6-9`.
- Missing from rendered inventory: canonical URL, `og:image`, `og:url`, Twitter card tags, favicon.
- `FAQPage` structured data in `Backend/GreekGeekApi/templates/landing.html:298-329` only includes 3 of 6 visible FAQ items.
- `SoftwareApplication` structured data should match the landing-page assumption that GreekGeek is available through iOS App Store distribution and web/admin access.
- Visible copy uses `Greek organizations`; it should also explicitly target `fraternities`, `sororities`, `chapter study hours`, and `study hour tracking software`.

## Why It Hurts

The current title/meta/H1 are a good base, but the page is leaving search and sharing quality unfinished. Social shares may render without an image. Search engines have less canonical clarity. High-intent fraternity/sorority study-hour queries are underused. Structured data should match what is visible and true.

Google's SEO Starter Guide emphasizes clear titles, useful snippets, image context, and descriptive alt text. Google's FAQ structured-data documentation also makes clear that FAQ rich results are not broadly available for all sites, so the visible FAQ and page copy matter more than treating schema as a shortcut.

Sources:

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google FAQ structured data documentation](https://developers.google.com/search/docs/appearance/structured-data/faqpage)
- [CampusStudy](https://campusstudy.app/)
- [GreekHours](https://greekhours.com/)

## Remediation Plan

1. Add canonical and social URL metadata in `base.html`, with page-level override blocks if needed.
2. Add `og:image`, `og:url`, `twitter:card`, `twitter:title`, `twitter:description`, and `twitter:image`.
3. Create or reuse a branded social image that shows the actual product UI, not abstract art.
4. Add favicon links and serve `/favicon.ico` or equivalent icons.
5. Revise title/meta to include both brand and high-intent category language.
6. Add visible copy for high-intent search phrases:
   - `study hour tracking for fraternities and sororities`,
   - `location-verified study sessions`,
   - `chapter study requirements`,
   - `academic chair reports`.
7. Align structured data:
   - update `operatingSystem` to match iOS App Store distribution and web/admin access,
   - include a URL,
   - either include all visible FAQ items or reduce visible FAQ/schema to the same list,
   - complete price fields with `$149.99` per organization per year once the public checkout/trial flow supports the offer.

## Likely Files

- `Backend/GreekGeekApi/templates/base.html`
- `Backend/GreekGeekApi/templates/landing.html`
- `Backend/GreekGeekApi/static/img/` for favicon and social card
- `Backend/GreekGeekApi/static/css/main.css` only if adding a new visible SEO/support section

## Suggested Metadata

```html
<title>GreekGeek | Study Hour Tracking for Fraternities and Sororities</title>
<meta name="description" content="GreekGeek helps fraternity, sorority, and campus organization leaders set study requirements, verify location-based sessions, and track chapter progress.">
<link rel="canonical" href="https://greekgeek.app/">
<meta property="og:title" content="GreekGeek | Study Hour Tracking for Fraternities and Sororities">
<meta property="og:description" content="Set chapter study requirements, verify sessions at approved locations, and see who is on track before deadlines become a problem.">
<meta property="og:url" content="https://greekgeek.app/">
<meta property="og:image" content="https://greekgeek.app/static/img/greekgeek-social-card.png">
<meta name="twitter:card" content="summary_large_image">
```

## Acceptance Criteria

- Rendered home page includes canonical, Open Graph image/url, Twitter card tags, and favicon links.
- `/favicon.ico` or configured icon URL returns 200.
- Social card image is product-specific and loads at its public URL.
- Structured data parses as valid JSON and matches visible page truth.
- Visible copy includes fraternity/sorority and study-hour tracking language near the top of the page.
- Re-run DOM inventory confirms metadata presence.
