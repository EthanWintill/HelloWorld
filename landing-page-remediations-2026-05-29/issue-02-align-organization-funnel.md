# Issue 02: Align Organization Funnel Labels And Destination

Severity: P1
Score impact: raises CTA effectiveness, completeness, and funnel readiness from `2` toward `4`
Linked audit section: Prioritized Issues, Recommended Implementation Order

## Current Evidence

- Landing primary CTA: `Register your organization` in `Backend/GreekGeekApi/templates/landing.html:21`.
- Pricing/access section: `Pilot access`, `Request access`, then another `Register your organization` CTA in `Backend/GreekGeekApi/templates/landing.html:213-228`.
- Destination page title: `Start Free Trial - GreekGeek` in `Backend/GreekGeekApi/templates/register.html:3`.
- Destination page H2/button: `Start Your Free Trial` in `Backend/GreekGeekApi/templates/register.html:12` and `Backend/GreekGeekApi/templates/register.html:87`.
- The form immediately asks for personal info, password, organization name, school, and custom registration code in `Backend/GreekGeekApi/templates/register.html:24-90`.

## Why It Hurts

Decision makers see three different promises: register organization, request access, and start free trial. Those imply different commitment levels. A chapter president or advisor who expects a low-friction request/demo may abandon a full account-creation form, especially without pricing, setup details, support contact, or trial terms.

Competitor benchmarks make the offer state clearer. CampusStudy shows price and comparison details. GreekHours separates `Get Started` from `Request Chapter Access`. Greeky offers both `Get Started` and `Schedule a Demo`.

Sources:

- [CampusStudy](https://campusstudy.app/)
- [GreekHours](https://greekhours.com/)
- [Greeky](https://www.greeky.app/)

## Remediation Plan

Confirmed offer as of 2026-05-29:

- `$149.99` per year per organization.
- One-month free trial before paid annual billing.
- Do not use a one-year free trial.

1. Use the confirmed self-serve trial language as the primary organization conversion:
   - `Start your one-month free trial`
   - `Register your organization`
2. Make the hero, nav, pricing section, final CTA, and destination page use the same label.
3. If keeping the existing `/register/` form, revise the landing copy to make the commitment clear before click:
   - `Create an admin account, set up your chapter, and share your member code. Your first month is free, then the organization plan is $149.99/year.`
4. If a payment method is required at signup, state that before the click. If payment is collected later, state when billing begins.
5. Add a "What happens next" block next to the form:
   - `Create admin account`
   - `Set study period and locations`
   - `Share member registration code`
   - `Invite members to clock in`
6. Resolve pricing language:
   - Replace `Chapter pricing / Request access` with `$149.99/year per organization` and `One-month free trial`.

## Likely Files

- `Backend/GreekGeekApi/templates/landing.html`
- `Backend/GreekGeekApi/templates/register.html`
- `Backend/GreekGeekApi/static/css/main.css` for form/CTA support styling
- `Backend/GreekGeekApi/Study/views.py` only if the form workflow changes

## Suggested Copy

For the confirmed self-serve launch:

```text
Start your one-month free trial
Create an admin account, set your first study period, and generate the registration code members use to join. After the first month, GreekGeek is $149.99 per organization per year.
```

Pricing card:

```text
$149.99 / year
per organization
One-month free trial included.
```

Destination page heading:

```text
Start Your One-Month Free Trial
Create your admin account and chapter workspace.
```

## Acceptance Criteria

- Hero/nav/pricing/final CTA and `/register/` page agree on one conversion promise.
- No page says `Request access` if the next step is a full self-serve free-trial signup unless the copy explains that.
- Public pricing is shown as `$149.99/year per organization` wherever pricing appears.
- Public landing-page trial copy says one month free and does not offer a one-year trial.
- The destination page includes a concise "what happens next" explanation.
- Pricing status is not blank or ambiguous.
- Desktop and mobile CTA click checks show the same expectation before and after navigation.
