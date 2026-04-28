# Greek Geek Landing Page PRD

Date: 2026-04-28
Project: HelloWorld / Greek Geek
Owner: HelloWorld launch workstream
Status: Planning draft

## 1. Objective

Create a clean, modern landing page for Greek Geek that explains the app quickly, drives individual members to sign up with an organization code, and drives chapter or organization leaders to request paid organization access.

The page should feel polished, real, and specific to campus organization study accountability. It should not look like an AI-generated SaaS template.

## 2. Product Positioning

Greek Geek is a study accountability platform for fraternities, sororities, and campus organizations that need members to complete required study hours, verify location-based study sessions, and give officers/admins a clear view of participation.

Primary promise:

> Turn chapter study hours from a manual tracking problem into a simple, verifiable scorecard.

Supporting promises:

- Members can clock in at approved study locations.
- Organizations can set requirements, periods, groups, and study locations.
- Officers can see leaderboards, reports, live study activity, and progress toward requirements.
- The app creates accountability without making the process feel heavy.

## 3. Target Audiences

### Primary: Organization Decision Makers

Examples: chapter presidents, academic chairs, standards chairs, house directors, advisors, Greek life staff, and student organization officers.

Need:

- Better visibility into who is meeting study requirements.
- Less spreadsheet/manual proof chasing.
- A cleaner system than group chats, Google Forms, sign-in sheets, or self-reported hours.

Primary CTA:

- `Register your organization`
- Secondary CTA: `Book a demo` or `Request access`

### Secondary: Members

Examples: fraternity/sorority members or student organization members who were given a registration code.

Need:

- Register quickly.
- Understand that the app is for required study hours.
- Sign in and clock study time without confusion.

Primary CTA:

- `Register with code`
- Secondary CTA: `Sign in`

## 4. Visual Direction

### Color Scheme

The entire app and landing page should use:

- Background: white
- Text: black / near-black
- Accent: green
- Support neutrals: light gray borders, soft gray backgrounds, muted gray body text

Recommended tokens:

- `--color-background: #FFFFFF`
- `--color-text: #0B0F0E`
- `--color-muted: #5F6B63`
- `--color-border: #E5E7E5`
- `--color-surface: #F7F8F7`
- `--color-green: #16A34A`
- `--color-green-dark: #0F7A35`
- `--color-green-soft: #EAF7EE`

### Design Guardrails

- Use a white, editorial layout with strong typography and restrained green accents.
- Avoid generic gradient hero backgrounds, blob shapes, 3D abstract art, fake dashboard numbers, and overly rounded SaaS cards.
- Use real product UI, real campus-like context, and crisp copy.
- Keep cards modest: 8px radius maximum unless matching app UI.
- Use plenty of whitespace, but keep the page useful above the fold.
- Make the first viewport clearly say what Greek Geek does.
- Mobile should feel like the primary canvas, not an afterthought.

### Typography

Preferred direction:

- Use the app's existing Poppins family if the web implementation can load it cleanly.
- If performance or licensing is simpler, use a modern system stack: `Inter`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif.
- Headline type should be confident but not oversized.
- Body copy should be short, direct, and readable.

## 5. Page Structure

### Global Header

Elements:

- Greek Geek logo / wordmark
- Nav anchors: `How it works`, `For organizations`, `Pricing`, `FAQ`
- Primary CTA: `Register your organization`
- Secondary member action: `Sign in`

Behavior:

- Sticky on desktop after scroll.
- Compact mobile menu with clear CTAs.
- Header should stay quiet; no heavy shadow.

### Section 1: Hero

Goal:

Explain the product in under five seconds and split the two conversion paths.

Headline options:

1. `Study hours, verified. Chapter progress, visible.`
2. `The study scorecard for Greek organizations.`
3. `Greek Geek keeps chapter study hours accountable.`

Recommended H1:

`The study scorecard for Greek organizations.`

Support copy:

`Greek Geek helps chapters set study requirements, verify study sessions at approved locations, and see who is on track before deadlines become a problem.`

Primary CTA:

- `Register your organization`

Secondary CTA:

- `Register with code`

Tertiary link:

- `Already have an account? Sign in`

Hero media:

- Preferred: real product screenshots composited into a clean phone mockup and admin dashboard preview.
- Fallback: AI-assisted campus study scene paired with real UI screenshots.
- Avoid: generic students staring at laptops with no product context.

### Section 2: Problem

Goal:

Name the current messy workflow without sounding dramatic.

Copy direction:

`Study requirements are easy to set and hard to track. Hours get logged in spreadsheets, proof gets sent through group chats, and officers only realize who is behind when it is already late.`

Visual:

- Three compact columns:
  - `Manual tracking`
  - `Late visibility`
  - `Unverified hours`

### Section 3: How Greek Geek Works

Goal:

Show the product workflow.

Steps:

1. `Set requirements`
   - Admins create study periods, required hours, groups, and approved locations.
2. `Members clock in`
   - Members start study sessions from the app at approved study locations.
3. `Track progress`
   - Officers see leaderboards, live studying, reports, and progress toward goals.

Media:

- Use app UI screenshots for study clock-in, leaderboard, and admin/reporting.
- If screenshots are not ready, create wireframe-like product mockups based on the current app UI, then replace with real screenshots before launch.

### Section 4: Member Experience

Goal:

Show that members can use the app without training.

Content:

- Register with organization code.
- See current study requirement and personal hours.
- Clock in at a study location.
- Review study history.
- See leaderboard and current study activity.

Suggested headline:

`Simple enough for every member to actually use.`

### Section 5: Organization Admin Experience

Goal:

Make the buyer understand why they would pay.

Content:

- Manage users and groups.
- Create study periods.
- Add approved study locations.
- Review reports by user, group, period, and location.
- Reduce manual follow-up before deadlines.

Suggested headline:

`Built for the people responsible for chapter accountability.`

### Section 6: Proof / Trust

Initial version:

- Use product-specific proof rather than fake testimonials.
- Include concrete feature proof:
  - `Location-aware clock-ins`
  - `Period-based requirements`
  - `Leaderboards and live study status`
  - `Organization-level reporting`

Later version:

- Add testimonials from pilot chapters.
- Add quantified outcomes only after real measurement.
- Add school/chapter logos only with permission.

### Section 7: Pricing / Organization Funnel

Goal:

Convert organization buyers without forcing a full self-serve purchase before trust is built.

Recommended initial offer:

- `Pilot plan for one chapter`
- CTA: `Request organization access`
- Include: setup help, registration code, admin access, study locations, user import, first study period configuration.

Pricing display options:

1. `Contact for chapter pricing` for early launch.
2. `Starting at $X / organization / semester` once pricing is decided.
3. `Pilot access available` if the priority is first customer learning.

Recommendation:

Use `Request organization access` now. Do not show public pricing until payment packaging is final.

### Section 8: FAQ

Initial FAQ questions:

- `Who is Greek Geek for?`
- `Can members sign up without an organization code?`
- `How does location-based study verification work?`
- `Can admins set weekly or custom study periods?`
- `Can we manage groups within our chapter?`
- `Can we export or review reports?`
- `Is this only for Greek life?`
- `How do we start a pilot?`

### Section 9: Final CTA

Headline:

`Give your chapter a cleaner way to manage study accountability.`

CTAs:

- Primary: `Register your organization`
- Secondary: `Register with code`

## 6. Conversion Funnel

### Member Funnel

Entry points:

- Organic search
- Organization link
- QR code from chapter officers
- Direct link from app invite

Flow:

1. Landing page
2. Click `Register with code`
3. Sign-up page
4. Enter org registration code
5. Create account
6. Complete permissions/onboarding
7. First clock-in

Metrics:

- Visitor to `Register with code` click rate
- Sign-up completion rate
- Registration-code failure rate
- Permission completion rate
- First clock-in rate

### Organization Funnel

Entry points:

- SEO search
- Direct outreach
- Campus referrals
- Greek life advisor sharing
- Social/linkedin/email campaigns

Flow:

1. Landing page
2. Click `Register your organization`
3. Organization intake form
4. Qualification and setup call
5. Pilot setup
6. Admin activation
7. Member invites
8. Paid plan / semester renewal

Recommended organization intake fields:

- Name
- Email
- Role
- Organization name
- School
- Estimated member count
- Current tracking method
- Desired start date
- Notes

Metrics:

- Visitor to organization CTA click rate
- Form completion rate
- Qualified organization lead rate
- Setup-call booking rate
- Pilot activation rate
- Paid conversion rate
- Active members per organization
- Renewal intent after first study period

## 7. SEO Plan

### Primary SEO Goal

Rank for intent around Greek organization study-hour tracking, fraternity/sorority academic accountability, and chapter study requirements.

### Target Keywords

Primary:

- `Greek organization study hours app`
- `fraternity study hours tracker`
- `sorority study hours tracker`
- `chapter study hours tracking`
- `Greek life academic accountability app`

Secondary:

- `study hours app for student organizations`
- `fraternity academic chair tools`
- `sorority academic chair tools`
- `chapter study requirements`
- `college organization study tracker`
- `student organization accountability software`

### Page Metadata

Title:

`Greek Geek | Study Hour Tracking for Greek Organizations`

Meta description:

`Greek Geek helps fraternities, sororities, and campus organizations set study requirements, verify study sessions, and track chapter progress from one clean scorecard.`

Suggested URL:

- `/`
- `/for-organizations`
- `/register-organization`

Open Graph:

- `og:title`: `Greek Geek | The study scorecard for Greek organizations`
- `og:description`: `Set study requirements, verify sessions, and track chapter progress before deadlines become a problem.`
- `og:image`: branded landing-page social card with product UI

### Schema Markup

Add:

- `SoftwareApplication`
- `Organization`
- `FAQPage`
- `BreadcrumbList` if secondary pages are added

### Content Requirements

- H1 must include the category: `study scorecard` or `study hour tracking`.
- Use plain language for the target buyer: academic chair, president, advisor, Greek life staff.
- Add FAQ answers with direct language that can rank and be reused by AI answer engines.
- Avoid vague claims like `revolutionize your organization`.

## 8. GEO Plan

GEO means generative engine optimization: structuring the page so AI search/answer systems can summarize Greek Geek accurately.

### Answer Engine Goals

When someone asks an AI tool:

- `What app tracks fraternity study hours?`
- `How can a sorority track required study hours?`
- `What is Greek Geek?`

The desired answer should be:

`Greek Geek is a study accountability app for fraternities, sororities, and campus organizations. It lets organizations set study requirements, verify study sessions at approved locations, and track member progress with leaderboards and reports.`

### GEO Content Rules

- Include a concise `What is Greek Geek?` section near the top.
- Include clear entity statements:
  - `Greek Geek is a study hour tracking app for Greek organizations.`
  - `Greek Geek supports organization registration, member codes, study locations, study periods, leaderboards, and reports.`
- Use FAQ questions that mirror real search queries.
- Keep claims specific and verifiable.
- Include structured data for FAQ and software application.
- Add an `llms.txt` file later if the website stack supports it.

## 9. Media Plan

### Preferred Media Sources

1. Real app screenshots from the current mobile app.
2. Product mockups generated from actual screenshots.
3. AI-generated background or lifestyle imagery only where it supports the real product.
4. Short product demo clips recorded from the app once core flows are polished.

### Required Assets

- Hero phone mockup showing the study scorecard or clock-in screen.
- Secondary phone mockup showing leaderboard/live studying.
- Admin/reporting preview image.
- Social sharing image.
- Optional 10-15 second demo video for hero or organization section.
- Optional short vertical video for outreach/social ads.

### Screenshot Capture List

Capture these from the app before launch:

- Welcome screen
- Register with code
- Study clock-in screen with map/location
- Leaderboard
- History
- Admin dashboard
- Study periods
- Reports

### Nano Banana Image Prompt: Hero Product Scene

Prompt:

`Create a clean, realistic product marketing image for a mobile app called Greek Geek. White background, black text accents, green brand accents. Show two modern iPhone mockups with a study accountability app UI: one screen shows a study clock-in scorecard with green progress, the other shows a chapter leaderboard. Add subtle campus study context in the background: desk, notebook, laptop, coffee, natural daylight. Make it look like a premium real startup website, not an AI-generated SaaS template. No gradients, no abstract blobs, no fake brand logos, no unreadable text. Minimal, crisp, editorial composition.`

Negative prompt:

`No purple gradients, no 3D abstract shapes, no fantasy UI, no impossible phone reflections, no gibberish text, no fake testimonials, no cartoon characters, no exaggerated smiles, no cluttered campus stock photo look.`

### Nano Banana Image Prompt: Admin Reporting Preview

Prompt:

`Create a realistic web dashboard product mockup for Greek Geek, a study hour tracking platform for Greek organizations. White interface, black typography, green accents, light gray borders. Show organization-level reporting with rows for members, groups, study hours, progress to requirement, and location-based sessions. The layout should look like a real admin dashboard from a modern startup, compact and useful. Keep text mostly generic and readable, no fake brand logos.`

Negative prompt:

`No neon colors, no giant gradient cards, no AI-looking glassmorphism, no random charts without context, no unreadable tiny text, no exaggerated shadows.`

### Higgsfield / Hicksfield Video Prompt: Short Hero Demo

Prompt:

`Create a 12-second clean product video for Greek Geek, a study hour tracking app for fraternities, sororities, and campus organizations. Style: modern, realistic, white background, black text, green accents, premium startup website. Sequence: close-up of phone showing a member clocking into a study session at an approved campus location, quick cut to a chapter leaderboard with study hours updating, quick cut to an organization admin report showing members on track. Natural daylight, subtle camera motion, no dramatic effects, no generic AI people. End frame: Greek Geek logo and text "The study scorecard for Greek organizations."`

Negative prompt:

`No cartoon style, no futuristic holograms, no purple/blue gradients, no exaggerated AI faces, no unreadable interface text, no fake university logos, no fast chaotic cuts.`

### Higgsfield / Hicksfield Video Prompt: Social Ad Variant

Prompt:

`Create a 15-second vertical product ad for Greek Geek. Audience: fraternity and sorority officers responsible for study hours. Visual style: real campus study environment, clean app UI overlays, white/black/green brand palette. Opening hook text: "Still tracking chapter study hours in a spreadsheet?" Show messy spreadsheet/group chat for two seconds, then transition to Greek Geek app: members clock in, leaderboard updates, admin sees who is on track. End with "Request organization access." Keep it polished, believable, and not overly corporate.`

Negative prompt:

`No fake school logos, no exaggerated stock-photo acting, no meme style, no AI artifacts, no glitch effects, no busy visual clutter.`

## 10. Copy Tone

Tone:

- Clear
- Useful
- Confident
- Student-organization specific
- Not overhyped

Avoid:

- `AI-powered`
- `Revolutionary`
- `Transform your workflow`
- `Seamless`
- `Unlock potential`
- Generic productivity language

Use:

- `study requirements`
- `chapter progress`
- `approved study locations`
- `registration code`
- `academic chair`
- `members`
- `groups`
- `reports`

## 11. Technical Requirements

The PRD does not choose the final implementation stack, but the landing page should support:

- Fast static rendering.
- Mobile-first responsive layout.
- SEO metadata and structured data.
- Analytics events for CTA clicks and form submissions.
- Organization intake form.
- Member registration and sign-in deep links.
- Open Graph image.
- Sitemap and robots.txt.
- Accessible contrast and keyboard navigation.

Recommended tracking events:

- `landing_viewed`
- `member_register_clicked`
- `sign_in_clicked`
- `org_register_clicked`
- `org_form_started`
- `org_form_submitted`
- `pricing_viewed`
- `faq_opened`

## 12. Acceptance Criteria

The landing page is ready for launch when:

- It clearly explains Greek Geek above the fold.
- It has separate member and organization CTAs.
- It uses white, black, and green as the dominant design system.
- It includes real or product-faithful visuals.
- It includes SEO title, meta description, OG tags, and structured FAQ/schema markup.
- It includes a working organization intake flow.
- It routes existing members to sign in and new members to register with code.
- It looks credible on mobile and desktop.
- It avoids visual patterns that make it feel AI-generated.
- It has analytics for the core funnel.

## 13. Open Questions

- Should public-facing branding use `Greek Geek`, `GreekGeek`, or `HelloWorld` anywhere? Recommendation: use `Greek Geek` publicly and keep `HelloWorld` file-internal only.
- What is the first paid package: semester plan, annual plan, pilot plan, or per-member pricing?
- Should organization registration be self-serve immediately or sales-assisted for early pilots?
- What domain will host the landing page: existing `greekgeek.app`, a marketing subdomain, or the app web root?
- Are there real chapter/school names we have permission to use?
- Do we want a demo booking calendar or only a contact form for the first version?

## 14. Recommended Next Step

Before implementation, capture or create the first set of product visuals:

1. Record current mobile app screenshots.
2. Decide whether organization leads should go to a form, calendar, or email.
3. Decide the first paid organization offer.
4. Draft the exact landing-page copy from this PRD.
5. Build a low-fidelity page wireframe before writing production code.
