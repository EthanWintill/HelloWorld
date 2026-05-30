# Issue 03: Add Trust And Social Proof

Severity: P1
Score impact: raises trust/proof from `2` toward `4`
Linked audit section: Scorecard, Competitor And Comparable Notes

## Current Evidence

- `Product proof` in `Backend/GreekGeekApi/templates/landing.html:186-209` lists features, but there are no testimonials, pilot statements, school/chapter proof, support contact, founder/company credibility, or privacy reassurance near conversion points.
- Footer includes privacy and terms links in `Backend/GreekGeekApi/templates/base.html:77-78`, but no visible support/contact link.
- The page discusses location-aware clock-ins repeatedly, but the landing page does not explain location privacy, admin visibility, data retention, or support.
- `Backend/GreekGeekApi/templates/privacy.html` exists, but trust copy is not surfaced on the landing page.

## Why It Hurts

This product asks students and chapter officers to trust an app with account data, organization membership, study sessions, and location verification. A chapter buyer also needs confidence that setup, member onboarding, and support will work. Screenshots prove the product exists, but they do not prove operational reliability.

GreekHours names GPS verification, geofencing, custom boundaries, and app availability. CampusStudy explains weekly reports, approved locations, invite code onboarding, pricing, and FAQ details. Greeky adds broad social-proof claims and demo/sign-up paths. GreekGeek needs proof that matches its narrower launch stage without inventing fake metrics.

Sources:

- [GreekHours](https://greekhours.com/)
- [CampusStudy](https://campusstudy.app/)
- [Greeky](https://www.greeky.app/)

## Remediation Plan

1. Add a "Built for pilot chapters" or "Launch-ready basics" band before pricing.
2. Include truthful proof points:
   - `Real mobile clock-in flow`
   - `Admin reports and setup checklist`
   - `Member registration codes`
   - `Privacy and account deletion controls`
   - `Support: support@greekgeek.app`
3. Add a location privacy note near the location verification claim:
   - when location is used,
   - who can see session/location data,
   - where users can read the privacy policy.
4. Add pilot/setup reassurance in the pricing section:
   - setup help,
   - first study period configuration,
   - member import or code onboarding,
   - support during launch week.
5. Add testimonials or chapter/school logos only after permission. Until then, use product-specific proof, not fake logos.
6. Add footer links for `Support` or `Contact`.

## Likely Files

- `Backend/GreekGeekApi/templates/landing.html`
- `Backend/GreekGeekApi/templates/base.html`
- `Backend/GreekGeekApi/static/css/main.css`
- `Backend/GreekGeekApi/templates/privacy.html` only if the privacy copy itself needs updating

## Suggested Copy

```text
Built for the first study period
GreekGeek includes admin setup, member codes, approved study locations, reports, and support through your launch week.
```

```text
Location privacy
GreekGeek uses location to verify study sessions at approved areas. Members can review privacy details and account controls in the app, and chapter admins see study-session records needed for accountability.
```

```text
Need help setting up a chapter?
Email support@greekgeek.app.
```

## Acceptance Criteria

- A trust/proof section appears before the pricing/final CTA path.
- The page includes a visible support/contact route.
- Location verification claims include a plain-language privacy reassurance and link to `/privacy/`.
- No fake testimonials, fake logos, or unverifiable metrics are introduced.
- Desktop and mobile screenshots show trust/support content before or near a major CTA.
