# GreekGeek Landing Page Conversion Audit

Date: 2026-05-29
Route audited: `http://127.0.0.1:8000/`
Production spot check: `https://greekgeek.app/` returned the same title, meta description, stylesheet reference, and H1 on 2026-05-29.
Product assumption: GreekGeek is a study-hour accountability platform for fraternities, sororities, and campus organizations. Primary conversion goal is organization registration or access request; secondary goal is member access through an organization code or app download.
Update: after this audit, organization pricing was confirmed at `$149.99` per year per organization with a one-month free trial. A one-year free trial was considered and rejected.
Confidence: high. The audit used rendered screenshots, source inspection, local link checks, and current market research.

## Executive Summary

Overall grade: `B`

GreekGeek now has a credible, product-specific landing page. The first viewport explains the category clearly, real app screenshots are visible, the visual system is restrained, and the copy names a real operational pain: study requirements, location verification, and chapter progress.

The page is not fully launch-ready because the conversion paths are not honest enough yet. The App Store badge and "Register with code" actions do not lead to an app, TestFlight, deep link, or member registration flow. The organization CTA sends buyers into a "Start Free Trial" form even though the landing page promises "Pilot access" and "Request access." Trust proof, pricing, social sharing metadata, and small completeness details are also thin for a buyer-facing page.

Top conversion risks:

1. The member download/code path is a dead-end anchor, while the visual treatment implies a real App Store download.
2. The organization funnel mixes "Register your organization," "Request access," and "Start Free Trial," creating expectation mismatch at the highest-intent click.
3. There is no real trust layer: no support/contact block, no pilot status, no privacy/location reassurance near the CTA, and no customer or campus proof.
4. SEO/social metadata is partially implemented but missing canonical, Open Graph image, Twitter card tags, favicon, and broader high-intent category language.
5. Mobile is usable, but long stacked screenshot sections and hidden navigation CTAs make the page slower to scan after the first hero action.

Subagents: not used because the user did not explicitly request subagent research.

## Evidence Collected

Screenshots:

- `landing-page-audit-assets-2026-05-29/desktop-1440x900-viewport.png`
- `landing-page-audit-assets-2026-05-29/desktop-1440x900-full-loaded.png`
- `landing-page-audit-assets-2026-05-29/mobile-390x844-viewport.png`
- `landing-page-audit-assets-2026-05-29/mobile-390x844-full-loaded.png`
- `landing-page-audit-assets-2026-05-29/mobile-menu-open.png`
- `landing-page-audit-assets-2026-05-29/desktop-member-section-after-scroll.png`
- `landing-page-audit-assets-2026-05-29/desktop-org-section-after-scroll.png`
- `landing-page-audit-assets-2026-05-29/mobile-member-section-after-scroll.png`
- `landing-page-audit-assets-2026-05-29/mobile-org-section-after-scroll.png`

Viewport checks:

- Desktop: `1440x900`
- Mobile: `390x844`
- No horizontal scroll detected at desktop (`scrollWidth = clientWidth = 1440`).
- Playwright console initially showed one 404 for `/favicon.ico`; no other console errors persisted after reload.

Routes and source inspected:

- `Backend/GreekGeekApi/templates/landing.html`
- `Backend/GreekGeekApi/templates/base.html`
- `Backend/GreekGeekApi/templates/register.html`
- `Backend/GreekGeekApi/static/css/main.css`
- `Backend/GreekGeekApi/static/js/auth.js`
- `Backend/GreekGeekApi/GreekGeekApi/urls.py`
- `Backend/GreekGeekApi/Study/web_views.py`
- `landing-page-prd-2026-04-28.md`
- `venture.md`
- `DESIGN.md`

Local link and asset checks:

| URL | Result |
| --- | --- |
| `/` | 200 HTML |
| `/register/` | 200 HTML |
| `/login/` | 200 HTML |
| `/privacy/` | 200 HTML |
| `/terms/` | 200 HTML |
| `/favicon.ico` | 404 HTML |
| `/static/css/main.css` | 200 CSS |
| `/static/img/download-on-the-app-store.svg` | 200 SVG |
| `/static/img/greekgeek-pillar-logo.png` | 200 PNG |

Static inventory:

- Title: `GreekGeek | Study Hour Tracking for Greek Organizations`
- Meta description: present and specific to study requirements, session verification, and chapter progress.
- H1: `The study scorecard for Greek organizations.`
- H2 sections: problem, workflow, member experience, organization admin experience, product proof, pilot access, FAQ, final CTA.
- Primary CTA labels: `Register your organization`, `Register organization`, `Start Free Trial` on the destination page.
- Secondary/member CTA labels: `Download on the App Store`, `Register with code`, `Admin sign in`.
- CTA destinations: organization CTA goes to `/register/`; App Store badge goes to `#member-access`; `Register with code` goes to `#member-code-note` or `#member-access`.
- Metadata present: `description`, `og:title`, `og:description`, `og:type`.
- Metadata missing: canonical, `og:image`, `og:url`, Twitter card tags, favicon.
- Structured data: `SoftwareApplication` and `FAQPage` scripts exist. `FAQPage` only includes 3 of 6 visible FAQ items. `SoftwareApplication` says `iOS, Android, Web` even though the page copy says app links are not finalized.
- Images: real product screenshots exist, with descriptive alt text. Screenshot assets total about 4.4 MB.

Research sources:

- [CampusStudy](https://campusstudy.app/) - category-specific fraternity/sorority study hour landing page with price, comparison, location verification, invite code, and FAQ.
- [GreekHours website](https://greekhours.com/) - comparable hour-tracking page with clear availability, dual CTAs, platform links, GPS verification, and workflow copy.
- [GreekHours App Store listing](https://apps.apple.com/us/app/greekhours/id6758505889) - comparable App Store positioning around location verification, real-time progress, free tier, and organization/member flows.
- [Greek Chapter](https://www.greekchapter.com/) - broader Greek organization management page that explicitly includes study hours tracking.
- [Greeky](https://www.greeky.app/) - broader Greek-life management page with demo/get-started CTAs, mobile download area, feature sections, and social-proof claims.
- [Apple App Store Marketing Guidelines](https://developer.apple.com/app-store/marketing/guidelines/) - App Store badge usage and linking expectations.
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) - title links, snippets, image context, and alt text guidance.
- [Google FAQ structured data documentation](https://developers.google.com/search/docs/appearance/structured-data/faqpage) - FAQ structured-data eligibility and testing guidance.

## Scorecard

| Category | Score | Evidence |
| --- | ---: | --- |
| Brand impact | 4 | Real product screenshots, restrained white/black/green system, credible logo usage. Still needs favicon/social card and more trust proof. |
| Positioning and offer clarity | 4 | Hero says what the product is and who it serves. Strong category language, but "Greek organizations" could be expanded to "fraternities and sororities" for search and comprehension. |
| CTA effectiveness | 2 | Primary CTA is visible, but labels conflict across page and destination. App Store/member CTAs are not real conversion actions. |
| Download/register placement | 2 | Above-fold App Store badge and member CTA exist visually, but both lead to explanatory anchors. Organization registration is repeated. |
| Mobile formatting | 3 | First viewport is readable and CTA is visible. Menu works. The scan path becomes long and image-heavy, and member/admin paths are not equally actionable. |
| Desktop formatting | 4 | Strong first viewport, balanced hero screenshots, good section rhythm. Pricing/proof sections need stronger buyer detail. |
| Feature and benefit coverage | 4 | Workflow, member, admin, product proof, and FAQ are present. Specificity is good. |
| Trust and proof | 2 | Product proof exists, but no pilots, testimonials, school/chapter logos, founder/contact, support, privacy/location reassurance, or setup guarantee near conversion points. |
| SEO and search intent | 2 | Title/meta/H1 are good starts. Missing canonical/social image/Twitter/favicons; copy does not fully cover high-intent phrases and comparison/pricing intent. |
| Completeness and funnel readiness | 2 | `/register/` works, but landing CTA expectation mismatches destination. App download/code flow is a placeholder. Favicon 404. |
| Performance/accessibility | 3 | No horizontal scroll; images have alt text. Issues: 4.4 MB screenshot payload, external CDN dependencies, hamburger lacks explicit accessible label, favicon 404. |
| Competitive differentiation | 3 | Study-hour accountability is clear, but competitors show pricing, comparison, app availability, GPS/geofencing specifics, and trust/proof more directly. |

## Prioritized Issues

| Priority | Issue | Severity | Main impact | Remediation |
| --- | --- | --- | --- | --- |
| 1 | Member App Store and code CTAs are misleading placeholders | P1 | Lost member conversions and trust risk | [issue-01-fix-member-download-and-code-ctas.md](landing-page-remediations-2026-05-29/issue-01-fix-member-download-and-code-ctas.md) |
| 2 | Organization funnel promises request/pilot access but routes to a free-trial form | P1 | Buyer expectation mismatch and lower form completion | [issue-02-align-organization-funnel.md](landing-page-remediations-2026-05-29/issue-02-align-organization-funnel.md) |
| 3 | Trust proof is too thin for a paid chapter operations product | P1 | Reduced credibility with officers/advisors | [issue-03-add-trust-and-social-proof.md](landing-page-remediations-2026-05-29/issue-03-add-trust-and-social-proof.md) |
| 4 | SEO and social metadata are incomplete | P2 | Weaker search snippets, shares, and AI/search comprehension | [issue-04-strengthen-seo-social-metadata.md](landing-page-remediations-2026-05-29/issue-04-strengthen-seo-social-metadata.md) |
| 5 | Mobile scan path is usable but too long for quick buyer evaluation | P2 | Lower mobile comprehension after hero | [issue-05-tighten-mobile-scan-path.md](landing-page-remediations-2026-05-29/issue-05-tighten-mobile-scan-path.md) |
| 6 | Performance, accessibility, and completeness polish need a launch pass | P2 | Slower page, weaker polish, minor accessibility gaps | [issue-06-improve-performance-accessibility-completeness.md](landing-page-remediations-2026-05-29/issue-06-improve-performance-accessibility-completeness.md) |

## SEO Opportunity Map

High-intent category queries:

- `fraternity study hours app`
- `sorority study hours app`
- `study hour tracking software for fraternities`
- `Greek life study hour tracking`
- `chapter study hours tracker`
- `location verified study hours`

Recommended page usage:

- Title: include "Fraternity & Sorority Study Hour Tracking" or "Study Hour Tracking for Fraternities and Sororities."
- H1 or hero subhead: keep "study scorecard" if brand language matters, but include "fraternities and sororities" in the first paragraph.
- Feature headings: use query-aligned headings such as `Location-verified study timers`, `Chapter study requirements`, `Invite members with an organization code`, and `Reports for academic chairs`.
- FAQ: add questions for "How do fraternity study hours work?", "Can chapters verify study location?", "Can advisors view reports?", "How much does GreekGeek cost?", and "Is GreekGeek available on iPhone?"
- Footer/internal links: add `Contact`, `Support`, `Privacy`, `Terms`, and eventually `Pricing` or `Request demo`.

Alternative/comparison queries:

- `GreekHours alternative`
- `CampusStudy alternative`
- `MyGreekStudy alternative`
- `best fraternity study hours app`

Recommended page usage:

- Add a simple comparison section only when the product can truthfully claim differences.
- Candidate differentiators: setup help for one pilot chapter, admin scorecard, study locations, period requirements, member code onboarding, and reports.

Bottom-funnel queries:

- `GreekGeek app`
- `GreekGeek pricing`
- `GreekGeek App Store`
- `GreekGeek register organization`
- `GreekGeek demo`

Recommended page usage:

- Choose one organization funnel label and make the destination match it.
- Add real App Store/TestFlight/deep-link URLs only when available.
- Add the confirmed pricing status: `$149.99/year per organization` and `one-month free trial`.

Trust queries:

- `GreekGeek privacy`
- `GreekGeek location tracking`
- `GreekGeek support`
- `GreekGeek delete account`

Recommended page usage:

- Link privacy/terms from CTA-adjacent copy when location verification is discussed.
- Add a short location privacy block: when location is used, what is stored, who can see it, and how to get support.

## Competitor And Comparable Notes

CampusStudy is the closest page-level benchmark. It leads with "Fraternity & Sorority Study Hour Tracking Software," explains approved-location tracking, has weekly reports, includes pricing at `$179 /yr`, and shows a comparison table. GreekGeek is visually more polished, but CampusStudy is clearer for bottom-funnel buyers who need price, scale, invite-code details, and comparison context.

GreekHours is the closest product/funnel benchmark. It states availability on iOS and Android, shows platform links, uses dual CTAs (`Get Started` and `Request Chapter Access`), and explains GPS verification/geofencing. GreekGeek uses an App Store badge before the app link is finalized, which makes its download path feel less trustworthy by comparison.

Greek Chapter and Greeky show the broader Greek-life management category. They are less focused on study hours, but they demonstrate expected page elements for chapter software: broad feature coverage, demo/get-started paths, social proof claims, platform availability, and footer/legal/contact basics.

Google's SEO documentation supports keeping page titles clear and unique, using concise meta descriptions, placing high-quality images near relevant text, and providing useful alt text. GreekGeek already does some of this well, but the missing canonical/social image/Twitter metadata and thin query coverage leave search opportunity on the table.

Google's FAQ documentation now limits FAQ rich results mostly to authoritative government or health sites, so FAQ schema should not be treated as a guaranteed SERP enhancement. Keep it valid and aligned, but prioritize visible FAQ quality and category copy first.

Apple's App Store badge guidance treats the badge as a clear call to action to get the app and points developers toward generated links for the App Store product page. GreekGeek should not present the badge as a download CTA until it can link to App Store, TestFlight, or an explicit waitlist/preorder state.

## Recommended Implementation Order

1. Fix the CTA truth problem first: replace placeholder App Store/member CTAs with the real current state, and align organization CTA labels with their destination.
2. Add a trust/access band near the first and pricing CTAs: pilot status, support email, privacy/location reassurance, setup help, and what happens after registration.
3. Strengthen SEO/social metadata and add favicon/social image assets.
4. Tighten the mobile scan path so section proof and CTAs arrive faster.
5. Optimize screenshots, add accessible nav labels, and run final launch checks.

## Verification Plan

After implementing remediations:

1. Run Django locally from `Backend/GreekGeekApi` and open `http://127.0.0.1:8000/`.
2. Capture `1440x900` and `390x844` viewport plus full-page screenshots.
3. Click every primary and secondary CTA on desktop and mobile.
4. Confirm organization CTA label and `/register/` page title/button match.
5. Confirm member/App Store action leads to a real app, TestFlight, deep link, waitlist, or clearly labeled unavailable state.
6. Check `/favicon.ico`, `/privacy/`, `/terms/`, static CSS, logo, screenshots, and social image return 200.
7. Re-run a DOM metadata inventory for canonical, `og:image`, `og:url`, Twitter tags, and structured data.
8. Inspect mobile menu open/close behavior and CTA visibility at natural decision points.
9. Check screenshot asset sizes and verify no layout shift or horizontal scroll.
