# LittleLamb Nannies — Agent Instructions

## Model
claude-opus-4-8

## Stack
React, TypeScript, Vite, Firebase (auth + firestore + storage)

## Context Management
- Before context runs out, write all remaining incomplete tasks to Backlog.md
- New sessions start by reading CLAUDE.md, DECISIONS.md, and Backlog.md
- Then run git log --oneline to confirm what's built
- Then continue from Backlog.md

## Active Plugins
- ux-ui-mastery: use for ALL UI and design decisions
- vibe-security: security checklist at docs/security-checklist.md — run on every auth, data, and API feature

## Design Direction
- Aesthetic: Warm Editorial — soft neutrals, serif headings, human-forward, premium and trustworthy
- NEVER use: Inter, Roboto, Arial, Space Grotesk
- Mobile-first always
- WCAG AA minimum
- No generic SaaS card grids, no purple gradients, no stacked card layouts

## Security Rules
- Firebase config via .env only, never hardcoded
- All Firestore rules explicit, no open reads or writes
- Sanitize every user input before any database write
- Run security checklist on auth, RBAC, input validation before every commit
- Rate limiting on all API endpoints

## Architecture
- /src/components — UI only, no business logic
- /src/hooks — all Firebase calls live here
- /src/pages — route-level components
- /src/types — shared TypeScript interfaces
- /firestore.rules — always update alongside any feature that touches data
- /docs — security and reference docs, read before building any sensitive feature

## Agentic Behavior — CRITICAL
- Never stop to ask anything
- Never pause mid-feature waiting for input
- Make all decisions autonomously, document everything in DECISIONS.md
- Use subagents for all parallelizable work
- Commit after every major section with a clear message
- If blocked, try an alternative and document it
- Run tests after every feature, fix recursively until passing
- Do not stop until the full task is complete

## User Flows

# Little Lamb Nannies — Master User Flow
**Version:** 1.0 — May 2026
**Scope:** All three user types — Family, Nanny, Admin
**Status:** Confirmed with open items noted — ready for Lucy & David review
**Site:** littlelambnannies.com
 
---
 
## Overview
 
Little Lamb Nannies connects Santa Barbara families with pre-screened, admin-approved nannies. This master document covers the complete user flow for all three user types — Family, Nanny, and Admin — in one place. It is designed for Lucy and David to review the full platform picture together, identify open items, and sign off before build begins.
 
Open items are flagged inline throughout and consolidated at the bottom of this document.
 
---
 
## User Types
 
| Type | Description |
|------|-------------|
| **Family** | Parents/guardians who browse nannies, make bookings, and pay quarterly |
| **Nanny** | Pre-approved childcare professionals who manage availability and profiles |
| **Admin** | Lucy & David — full platform control, approvals, billing oversight |
 
---
 
## Part 1 — Public-Facing (Pre-Login)
 
### 1.1 Marketing Homepage
Shared entry point for all users. No login required.
 
- **Primary audience:** Families
- **Secondary audience:** Nannies — visible dedicated path, not buried
- **Navigation bar:** Logo (left) · "For Nannies" text link · "Log In" link · "Get Started" button (primary family CTA)
- **Hero section:** Family-focused headline, trust subheadline, "Get Started" CTA, secondary link "Are you a nanny? Apply here"
- **How it works:** 3-step family flow — Browse → Book → Enjoy
- **Trust section:** Background check and interview promise, Santa Barbara community focus
- **Nanny preview:** 2–3 real nanny profile cards teased
- **Bottom CTA:** Second "Get Started" button
- **Footer:** Contact, About, For Nannies link, Login, legal links
### 1.2 Family Info Page
- Reached via "Get Started" from homepage
- Explains the platform, vetting process, and what families can expect
- Ends with "Apply Now" CTA leading to the family application form
### 1.3 Nanny Info Page
- Reached via "For Nannies" or "Apply here" from homepage
- Separate page — distinct content from family info page
- Covers: benefits of joining, vetting and approval process, platform experience, Santa Barbara community focus
- Ends with "Apply Now" CTA leading to the nanny application form
---
 
## Part 2 — Signup & Approval
 
### 2.1 Family Application & Account Creation
 
**Form fields:**
- Full name
- Email address
- Password (account created here)
- Phone number
- Neighborhood in Santa Barbara
- Number of children and ages
- Special needs or notes
- How did you find us? (optional dropdown — suppressed if arrived via referral link)
**On submission:**
- Account created in pending state
- Application sent to admin dashboard
- Family can log in immediately — lands on holding page
**Holding page:**
- Message: application under review, notification on approval
- Optional early profile completion prompt: "Want to get a head start? Complete your profile now."
- "Complete Your Profile" button launches setup wizard in voluntary mode
- Progress saved — resumes post-approval; completed steps auto-filled and skipped
---
 
### 2.2 Nanny Application & Account Creation
 
**Form fields:**
- Full name
- Email address
- Password (account created here)
- Phone number
- Years of childcare experience
- Short personal statement
- Referral attribution (auto-tagged if arrived via referral link; otherwise optional dropdown: Google / Instagram / Friend / Other)
> **⚠️ Open item:** Final nanny application form fields — confirm with Lucy before build
 
**On submission:**
- Account created in pending state
- Application sent to admin dashboard
- Nanny can log in immediately — lands on holding page
- Automated email fires: "We've received your application"
**Holding page:**
- Application status progress bar:
  1. Application Received
  2. Under Review
  3. Interview Scheduled
  4. Decision Made
- Admin advances status via button in admin dashboard
- Each advancement auto-updates progress bar + fires email to nanny
- When "Interview Scheduled" fires: email includes Calendly link for nanny to self-book
- Optional early profile completion (same logic as family — voluntary wizard, progress saved)
> **⚠️ Open item:** Calendly account setup — required before interview scheduling emails can be configured
 
---
 
### 2.3 Admin Review Process
 
**For nanny applicants:**
- Admin sees all pending nanny applications in dashboard
- Admin advances application status through stages (Application Received → Under Review → Interview Scheduled → Decision Made)
- Admin clicks Approve or Reject at Decision Made stage
- Approved: nanny receives approval email; next login triggers setup wizard (or goes to dashboard if wizard already completed)
- Rejected: nanny receives rejection email; account remains inactive
**For family applicants:**
- Admin sees all pending family applications in dashboard
- Admin clicks Approve or Reject
- Approved: family receives approval email; next login triggers setup wizard (or goes to dashboard if wizard already completed)
- Rejected: family receives rejection email; account remains inactive
---
 
## Part 3 — Post-Approval Onboarding (Setup Wizards)
 
### 3.1 Family Setup Wizard
Triggered on first login after approval (unless already completed during pending phase). Must be completed before dashboard access. Progress saved on browser close.
 
**Progress bar displayed throughout. Steps cannot be skipped.**
 
- **Step 1 — Family Profile:** Photo, children's names/ages/interests, pets, allergies/special needs, house rules, home address
- **Step 2 — Contact Information:** Primary email (pre-filled), phone number, spouse/co-parent name and email
- **Step 3 — Payment Card:** Required — cannot proceed without adding a card; stored for quarterly billing
- **Completion Screen:** "You're all set — welcome to Little Lamb" → "Go to your Dashboard"
---
 
### 3.2 Nanny Setup Wizard
Same triggering logic as family. Must be completed before dashboard access. Progress saved on browser close.
 
**Progress bar displayed throughout. Steps cannot be skipped.**
 
- **Step 1 — Profile Photo & Bio:** Photo (required), bio up to 500 characters
- **Step 2 — Intro Video:** Self-recorded, max 1 minute; on-screen prompt guides content; required — cannot proceed without uploading; goes live immediately, no admin review
- **Step 3 — Badges:** Nanny selects self-reported badges (e.g. Pet-Friendly, Ages 0–2, Ages 3–7, Ages 8–12); admin-verified badges (e.g. CPR Certified, First Aid) assigned separately by admin after interview; two badge types are color-coded to distinguish them
- **Step 4 — Weekly Availability:** Set recurring hours by day (e.g. Monday–Friday 3:00 PM–8:00 PM); days with no availability left blank; powers the booking system
- **Completion Screen:** "You're all set — welcome to Little Lamb" → "Go to your Dashboard"
> **⚠️ Open item:** Final badge list — confirm with Lucy before build
> **⚠️ Open item:** Brand colors for admin-verified vs self-reported badge visual differentiation
 
---
 
## Part 4 — Navigation Structure
 
### 4.1 Family Sidebar
- Little Lamb logo
- Family name + photo or initials
- Dashboard · Calendar · Bookings · Our Nannies · My Profile · Billing · Messages · Policies
- Settings · Log Out
### 4.2 Nanny Sidebar
- Little Lamb logo
- Nanny name + photo or initials
- Dashboard · Calendar · Bookings · Our Nannies · My Profile · Messages · Policies
- Settings · Log Out
- *(Billing not shown — nannies are never charged)*
### 4.3 Admin Sidebar
- Little Lamb logo
- Admin name (Lucy or David)
- Dashboard · Analytics · Nannies · Families · Bookings · Billing & Accounting · Messages · Settings
- *(No My Profile — admin has no public-facing profile)*
---
 
## Part 5 — Dashboards
 
### 5.1 Family Dashboard
Landing screen after login for approved, fully set-up families.
 
- **Summary cards:** Next upcoming booking (nanny name, date, time) · Bookings this quarter (running count)
- **Review prompt cards:** Appear after any booking date passes; "Leave a Review" or "Skip"; if skipped, review still accessible from Bookings page; reviews go to admin only — never public
- **Primary CTA:** "Book a Nanny" button → Calendar page
- **Recent messages preview:** Latest admin message with link to Messages page
---
 
### 5.2 Nanny Dashboard
Landing screen after login for approved, fully set-up nannies.
 
- **Summary cards:** Next upcoming booking (family name, date, time) · Pending booking requests (count awaiting accept/decline) · Open bookings (unmatched family requests nanny can pick up) · Availability status at a glance
- **Review prompt cards:** Same logic as family — appear after booking date passes; "Leave a Review" or "Skip"; reviews go to admin only
- **Recent messages preview:** Latest message with link to Messages page
---
 
### 5.3 Admin Dashboard
Action-first. Single scrollable page. Priority order fixed top to bottom. No metrics here — those live on Analytics.
 
**Priority stack:**
 
1. **Same-day booking requests — BANNER** (visually dominant, impossible to miss)
   > **⚠️ Open item:** Card design and action buttons — pending Lucy
2. **Unmatched bookings** — family requests with no available nanny; opens detail view (family, date, time, location, notes); admin assigns nanny from within detail view
   > **⚠️ Open item:** In-app nanny assignment mechanism — pending Lucy + business logic
3. **Nanny cancellation requests** — nannies cannot cancel directly; they message admin; admin actions cancellation from admin side; 48-hour self-cancel threshold under consideration
   > **⚠️ Open item:** Full cancellation workflow — pending Lucy + business logic
   > **⚠️ Open item:** 48-hour self-cancel threshold — pending Lucy
4. **Pending nanny applications** — applicant name, submission date, link to full record
5. **Pending family applications** — family name, submission date, link to full record
6. **Failed family payments** — family name, amount, failure date; retry or flag actions
---
 
## Part 6 — Calendar Pages
 
### 6.1 Family Calendar
Full scheduling view. Entry point for calendar-first booking flow.
 
- **View toggles:** Month / Week / Day / List
- **Color coding:** Green = confirmed · Amber = pending (awaiting nanny)
- **Interactions:** Click booking label → detail modal (view, cancel) · Drag open time slot → initiates booking flow
---
 
### 6.2 Nanny Calendar
Full scheduling and availability management view.
 
- **View toggles:** Month / Week / Day / List
- **Three slot states:** Empty (unavailable, default) · Available (nanny opened this slot) · Booked (confirmed family booking — "Booked — [Family Name]")
- **Color coding:** Green = available · Blue/filled = booked (exact color TBD with brand)
- **Availability interactions:** Drag on empty slot → marks available · Click available unbooked slot → removes availability · Booked slots locked — cannot be removed by nanny
- **Booking visibility:** When family confirms booking, slot auto-updates to booked; visible to other families as unavailable
> **⚠️ Open item:** How far in advance nanny can remove availability — confirm with Lucy
 
---
 
## Part 7 — Bookings Pages
 
### 7.1 Family Bookings Page
List view of all family bookings.
 
**Each booking card shows:** Nanny name · Date, start/end time · Home address · Notes · Status (confirmed / pending / cancelled)
 
**Actions:** View full details · Cancel booking (triggers email to nanny)
 
**Booking history:** Cancelled bookings remain visible with cancelled status
 
---
 
### 7.2 Nanny Bookings Page
List view of all nanny bookings — past, present, upcoming.
 
**Each booking card shows:** Family name · Date, start/end time · Home address · Family notes about children · Status (confirmed / pending / cancelled)
 
**Actions:**
- View full details
- Accept or decline (if pending — outside preset available hours)
  - Accept → confirmed; family notified by email + calendar invite sent to both
  - Decline → removed from nanny list; family notified to rebook
- Leave a review for any past booking (accessible any time, even after skipping dashboard prompt)
**Booking history:** Full log of all past completed bookings; no financial data shown
 
---
 
### 7.3 Admin Bookings Page
Platform-wide view of every booking across all families and nannies.
 
**Filters:** Status · Date range · Family name · Nanny name
 
**Actions on any booking:** Cancel · Reassign to different nanny · Edit date, time, location, notes
 
**Create Booking:**
- "Create Booking" button on Bookings page
- Form: select family, select nanny, set date/time, add notes
- Full admin override — no availability restrictions
- Admin confirms with both parties via Messages before creating
- Booking appears in both family's and nanny's records immediately
---
 
## Part 8 — Our Nannies Directory
 
### 8.1 Family View
Directory of all active nannies.
 
**Each nanny card shows:** Photo or initials · Name · Badge icons · Short bio excerpt (2 lines) · Availability indicator · "View Profile" button · "Book this Nanny" button
 
**Filtering:** Arrives from calendar drag → filtered to available nannies for selected slot · Browsing freely → all active nannies shown
 
---
 
### 8.2 Nanny View
Identical to family view with one difference:
- "Book this Nanny" buttons hidden — nannies cannot initiate bookings
- All other functionality identical — browse profiles, watch videos, see badges and availability
- Purpose: community visibility — nannies can see who else is in the network
---
 
## Part 9 — Full Nanny Profile Page
 
Reached by clicking "View Profile" from any nanny card. Shared view for both families and nannies (with booking buttons hidden for nanny users).
 
**Contents:**
- Full photo
- Full bio (up to 500 characters)
- Intro video (1 minute, self-recorded)
- Full badge list — color-coded (admin-verified vs self-reported) with labels
- Weekly availability grid
- Families this nanny has worked with (community trust signal)
- "Book this Nanny" button (families only)
- "Request Outside Hours" button (families only)
---
 
## Part 10 — My Profile Pages
 
### 10.1 Family My Profile
Editable at any time after wizard completion.
 
**Editable fields:** Family photo · Children's names, ages, interests · Pets · Allergies/special needs · House rules and notes · Home address · Primary email and phone · Spouse/co-parent name and email
 
---
 
### 10.2 Nanny My Profile
Editable at any time after wizard completion.
 
**Editable fields:** Profile photo · Bio (up to 500 characters) · Intro video (re-upload any time) · Self-reported badges · Weekly availability (manual hours — syncs with calendar)
 
**Admin-verified badges:** Displayed but not editable by nanny — assigned by admin through admin panel
 
**Profile completeness indicator:** Quiet indicator showing which elements are complete and which need attention; lives on My Profile page only — not on dashboard
 
**Families this nanny has worked with:** List of all families with completed bookings; visible to other families browsing profile; open by default — no opt-in required
 
---
 
### 10.3 Admin Profile
Admin has no public-facing profile. My Profile does not appear in admin sidebar. Account management lives in Settings.
 
---
 
## Part 11 — Booking Flows
 
### 11.1 Calendar-First Booking (Family)
1. Family drags a time slot on the Calendar page
2. Time slot saved as placeholder on calendar
3. Family redirected to Our Nannies — automatically filtered to available nannies for that slot
4. Family browses profiles, watches videos, reads bios
5. Family clicks "Select for [date/time]" on chosen nanny
6. Returned to calendar — booking filled in with nanny
7. Confirmation modal: date, time, nanny name, address
8. Family clicks "Confirm Booking"
**Outcome:**
- Within nanny's preset hours → auto-confirmed; nanny notified by email + calendar invite
- Outside nanny's preset hours → sent to nanny as request to accept or decline
- Same-day → routed to admin for manual processing
---
 
### 11.2 Nanny-First Booking (Family)
1. Family browses Our Nannies freely
2. Family opens a nanny's full profile
**Path A — Within available hours:**
- "Book this Nanny" → taken to calendar with nanny pre-selected → drag time slot → confirm → auto-confirmed
**Path B — Outside available hours:**
- "Request Outside Hours" → modal with date/time and pre-written editable message → family sends → nanny accepts or declines → family notified by email
---
 
### 11.3 Open Bookings (Nanny-Initiated)
- When a family cannot find an available nanny, booking enters open/unmatched state
- Surfaces on nanny dashboard as dedicated card (family, date, time, location)
- Nanny clicks Accept → booking immediately confirmed → family notified by email + calendar invite sent to both
- No admin mediation required
---
 
### 11.4 Recurring Bookings
- During confirmation, family selects "Make this recurring" (weekly is primary use case)
- Nanny holds priority on that time slot going forward
- If nanny changes availability conflicting with recurring booking: system detects 48 hours in advance → auto-cancels that instance → both family and nanny notified by email
- Family has 48-hour window to find alternative coverage
---
 
### 11.5 Same-Day Bookings
- Family places booking for same day → does not go to nanny directly
- Routed to admin for manual processing
- Admin contacts nanny, confirms or declines
- Family notified of outcome by email
> **⚠️ Open item:** Same-day booking card design and admin action flow — pending Lucy
 
---
 
### 11.6 Family Cancellations
- Cancel from Calendar page (click booking label → cancel) or Bookings page (click card → cancel)
- Nanny automatically notified by email
- Cancelled bookings remain in history with cancelled status
---
 
### 11.7 Nanny Cancellations
- Nannies cannot cancel bookings directly through the app
- Nanny messages admin through platform with cancellation reason
- Admin reviews and actions cancellation from admin side
- 48-hour self-cancel threshold under consideration
> **⚠️ Open item:** Full nanny cancellation workflow — pending Lucy + business logic
> **⚠️ Open item:** 48-hour self-cancel threshold — pending Lucy
 
---
 
## Part 12 — Messages
 
### 12.1 Family Messages
- Conversation types: Family ↔ Admin · Family ↔ Nanny
- Layout: Left panel (conversation list + last message preview) · Right panel (full thread)
- "New Message" button to start conversation with admin or any nanny they've worked with
---
 
### 12.2 Nanny Messages
- Conversation types: Nanny ↔ Admin (initiate any time) · Nanny ↔ Family (can only initiate if completed booking exists)
- Same layout as family messages
---
 
### 12.3 Admin Messages
- Unified inbox for all platform communications
- Filter toggle: All / Families / Nannies
- "New Message" button to initiate with any family or nanny
**Internal reply tracking (admin-only — never visible to families or nannies):**
- When replying, admin tags: Lucy or David
- Thread shows internally: "Replied by Lucy — [timestamp]" or "Replied by David — [timestamp]"
- Families and nannies see only: "Admin Team"
> **⚠️ Open item:** Separate admin logins vs shared account — pending Lucy (separate logins would auto-tag replier)
 
**Message status options:** Unread · Read · Replied · Mark as Unread (manual — pushes back to unread even after opening)
 
---
 
## Part 13 — Billing
 
### 13.1 Family Billing Page
- Bookings this quarter (running count)
- History of all past invoices with PDF download per invoice
**Billing model:**
- $25 flat platform subscription per quarter
- $1 per confirmed booking, accumulated throughout quarter
- Auto-charged every 90 days from signup date
- PDF invoice emailed at end of each billing cycle; also stored on billing page
---
 
### 13.2 Nanny Billing
- Nannies are never charged
- No billing page in nanny sidebar
- Nanny wages handled privately between family and nanny — not on platform
---
 
### 13.3 Admin Billing & Accounting Page
Four tabs:
 
**Overview:** Single scrollable view of all billing sections — quarterly review view
 
**Current Billing:** Per-family billing status; next charge date; bookings this quarter; outstanding amount; manually trigger invoice; retry failed payment; download full billing table as Excel
 
**Invoice History:** Full log of all invoices across all families; searchable by family name or date range; per-invoice PDF download
 
**Accounting:**
- Quarterly donation tracker: current quarter amount (auto-calculated as 10% of revenue) · "Mark as Donated" button
- Donation history log: date donated, amount, quarter covered
- Excel export: full billing table + donation log
---
 
## Part 14 — Analytics (Admin Only)
 
Separate from dashboard. For platform health review — not urgent action.
 
**Tab structure:** Overview · Platform Health · Revenue · Bookings · Growth
 
**Platform Health:** Active family count · Active nanny count · Family-to-nanny ratio (target 1:4) · Family churn rate · Nanny churn rate
 
**Revenue:** MRR · Quarterly revenue · Average revenue per family · Failed payment rate
 
**Bookings:** Total bookings this quarter · Booking completion rate · Unmatched booking rate · Most booked nannies · Recurring booking count
 
**Growth:** New family applications per month · New nanny applications per month · Application approval rate · Referral source breakdown
 
---
 
## Part 15 — Reviews
 
Applies to both families and nannies.
 
- After any booking date passes, a review card appears on the dashboard
- Card persists until acted on
- Options: "Leave a Review" or "Skip"
- If skipped, card disappears — review still accessible from Bookings page at any time
- All reviews go to admin only — never public-facing
- No email prompts — dashboard card is the only nudge
- Purpose: gives Lucy & David ground-level insight into match quality and platform health
---
 
## Part 16 — Referral System
 
Applies to both families and nannies.
 
- Every account has a unique referral link
- When someone signs up via referral link, source is auto-tagged in admin dashboard ("Referred by [Name]")
- No rewards or incentive program — lightweight attribution only
- If applicant arrives without referral link: optional dropdown (Google / Instagram / Friend / Other)
- Admin uses referral data to track growth channels and identify strongest community connectors
---
 
## Part 17 — Policies Pages
 
Accessible from sidebar for both families and nannies at all times.
 
**Structure:**
- **Little Lamb Policies** (top section) — platform-wide rules: general conduct, community expectations
- **Family Policies / Nanny Policies** (bottom section) — role-specific rules
> **⚠️ Open item:** Policies page content — confirm with Lucy before build
 
---
 
## Part 18 — Settings
 
### 18.1 Family Settings
- Email notification preferences
- Password change
- Payment card management
- Account deactivation request
### 18.2 Nanny Settings
- Email notification preferences
- Password change
- Account deactivation request
### 18.3 Admin Settings
- **Account management:** Login credentials, password change
- **Email templates:** View and edit all automated platform emails without developer involvement
- **Badge management:** Add, edit, or retire badges; changes reflect immediately across all nanny profiles and setup wizard
- **Platform policies:** Write and update content shown on Policies page for families and nannies
- **Referral link controls:** View all active referral links across platform
- **Billing configuration:** Adjust flat subscription fee and per-booking fee without developer involvement
- **Calendly integration:** Configure interview scheduling link; updates everywhere automatically when changed
> **⚠️ Open item:** Separate admin logins vs shared account — affects Settings account management — pending Lucy
 
---
 
## Part 19 — Automated Emails
 
All emails sent automatically — no manual action required unless noted.
 
| Event | Recipient | Content |
|-------|-----------|---------|
| Application received | Nanny | Confirmation under review |
| Application status updated | Nanny | Stage update + email fires on each admin advancement |
| Interview scheduled | Nanny | Status update + Calendly link |
| Application approved | Family + Nanny | Account live, next steps |
| Application rejected | Family + Nanny | Application update |
| Booking auto-confirmed | Family + Nanny | Date, time, location + calendar invite |
| Booking request sent (outside hours) | Family + Nanny | Family: awaiting reply · Nanny: accept or decline |
| Nanny accepts booking request | Family | Confirmed + calendar invite |
| Nanny declines booking request | Family | Please rebook with another nanny |
| Open booking picked up by nanny | Family | Confirmed + nanny details + calendar invite |
| Recurring booking auto-cancelled | Family + Nanny | Availability conflict, please rebook |
| Same-day booking outcome | Family | Confirmed or not possible |
| Nanny cancellation | Family | TBD — pending cancellation policy decision |
| Quarterly invoice generated | Family | Invoice PDF attached |
| Payment fails | Family | Action required — update payment method |
| New message received | Family + Nanny | Message notification |
 
**Calendar invites:**
- Sent to both family and nanny on any booking confirmation
- Contains: date, start/end time, family name, home address
- Compatible with Google Calendar, Apple Calendar, Outlook (iCal format)
- Cancellation notice sent to remove event if booking cancelled
> **⚠️ Open item:** Email provider (SendGrid vs Resend) — required before any automated emails can be set up
> **⚠️ Open item:** Calendar API (Google Calendar API vs iCal) — required before calendar invite feature can be built
 
---
 
## Part 20 — What Is NOT in the Platform
 
- **Nanny wages** — families pay nannies directly (cash, Venmo, etc.); not handled or facilitated by Little Lamb
- **Time tracking / clock in-out** — hours worked are between family and nanny
- **Background checks and interviews** — handled offline before approval; platform reflects outcome only
- **Non-circumvention agreements** — handled outside the platform
- **Push notifications** — email only for now; planned for future mobile app version
---
 
## Admin Permissions Summary
 
| Action | Admin |
|--------|-------|
| Approve / reject nanny applications | ✓ |
| Approve / reject family applications | ✓ |
| Edit any nanny profile, bio, badges, availability | ✓ |
| Edit any family profile | ✓ |
| Assign admin-verified badges | ✓ |
| Create bookings on behalf of any family | ✓ |
| Cancel any booking | ✓ |
| Reassign any booking to a different nanny | ✓ |
| Edit any booking (date, time, location, notes) | ✓ |
| Manually trigger invoices | ✓ |
| Retry failed payments | ✓ |
| Mark donations as distributed | ✓ |
| Edit email templates | ✓ |
| Edit platform policies | ✓ |
| Edit badge master list | ✓ |
| Adjust platform fees | ✓ |
| View all messages across the platform | ✓ |
 
---
 
## Consolidated Open Items
 
All items below must be confirmed with Lucy before build begins. Items marked **[BLOCKING]** will prevent a specific feature from being built at all until resolved.
 
| # | Item | Why it matters | Who decides |
|---|------|----------------|-------------|
| 1 | Final nanny application form fields | Determines what admin sees and what nannies submit | Lucy |
| 2 | Final badge list | Determines what traits and certifications nannies can display | Lucy |
| 3 | Brand colors for admin-verified vs self-reported badges | Visual differentiation system needs brand color assignment | Lucy + design |
| 4 | Same-day booking request card design | How Lucy & David action same-day requests in the admin dashboard | Lucy |
| 5 | Unmatched booking in-app assignment flow | Mechanism for assigning a nanny without going off-platform | Lucy + business logic |
| 6 | Nanny cancellation handling workflow | Full cancel policy, in-app flow, family replacement logic | Lucy + business logic |
| 7 | Nanny 48-hour self-cancel threshold | Whether nannies can cancel directly if booking is 48+ hours away | Lucy |
| 8 | Separate admin logins vs shared account | Affects reply tracking in Messages and Settings account management | Lucy |
| 9 | Booking/cancellation timing business logic | How far in advance bookings can be made, approval thresholds, nanny obligation windows | Lucy + business logic |
| 10 | How far in advance nanny can remove availability | Protects families from last-minute availability changes | Lucy + business logic |
| 11 | Policies page content | What platform-wide and role-specific policies appear | Lucy |
| 12 | Invoice visual design / branding | PDF invoice needs to match Little Lamb brand | Lucy + design |
| 13 | **[BLOCKING]** Email provider (SendGrid vs Resend) | Required before any automated emails can be set up | David + Lucy |
| 14 | **[BLOCKING]** Calendar API (Google Calendar API vs iCal) | Required before calendar invite feature can be built | David |
| 15 | **[BLOCKING]** Calendly account setup | Required for interview scheduling link in status emails | Lucy |
 
---
 
*This document covers all three user flows — Family, Nanny, and Admin — in one place.*
*Individual flow documents exist separately for deeper reference.*
*littlelambnannies.com · Santa Barbara, CA · Founded at Westmont College*

# Little Lamb Nannies — Admin User Flow
**Version:** 1.0 — May 2026
**Scope:** Admin user type only (Lucy & David)
**Status:** Confirmed with open items noted — ready for review
**Site:** littlelambnannies.com
 
---
 
## Overview
 
Little Lamb Nannies connects Santa Barbara families with pre-screened, admin-approved nannies. This document covers the complete admin user flow — the private panel used exclusively by Lucy and David to manage every aspect of the platform. It is the source of truth for design and development of the admin-facing experience.
 
---
 
## User Types (for context)
 
| Type | Description |
|------|-------------|
| **Family** | Parents/guardians who browse nannies, make bookings, and pay quarterly |
| **Nanny** | Pre-approved childcare professionals who manage availability and profiles |
| **Admin** | Lucy & David — full platform control, approvals, billing oversight |
 
---
 
## Section 1 — Login & Access
 
- Admin logs in through the same login page as families and nannies at littlelambnannies.com
- Admin account type routes directly to the admin panel — no role selection needed at login
- Admin has full override permissions across the entire platform
- No public-facing profile — admin is never visible to families or nannies
---
 
## Section 2 — Navigation Structure
 
Left sidebar navigation. Persistent across all admin pages.
 
**Sidebar contents (top):**
- Little Lamb logo
- Admin name (Lucy or David)
**Navigation items:**
- Dashboard (home — action items)
- Analytics
- Nannies
- Families
- Bookings
- Billing & Accounting
- Messages
- Settings
**Note:** No "My Profile" page for admin — admin has no public-facing profile on the platform.
 
---
 
## Section 3 — Dashboard (Home Screen)
 
The admin dashboard is **action-first**. It is a single scrollable page showing every item that requires Lucy and David's attention, ordered by operational priority from top to bottom. Metrics, ratios, and platform health data live on the Analytics page — not here.
 
### Priority Order (top to bottom)
 
**1. Same-day booking requests — BANNER**
- Displayed as a visually dominant banner at the top of the dashboard
- Must be impossible to miss before the eye travels further down the page
- **Card design and action buttons: TBD — pending Lucy's input**
**2. Unmatched bookings**
- Family booking requests where no available nanny was found
- Displayed as a card
- Card opens a detail view showing: family name, requested date and time, location, notes
- Admin assigns a nanny from within the detail view
- **In-app nanny assignment mechanism: TBD — pending Lucy + business logic**
**3. Nanny cancellation requests**
- Nannies cannot cancel bookings directly — they message admin requesting a cancellation with a reason
- Admin reviews the request and actions the cancellation from the admin side
- **Full cancellation handling workflow: TBD — pending Lucy + business logic**
- Business logic note: a 48-hour self-cancel threshold (nannies can cancel independently if booking is 48+ hours away) is under consideration — confirm with Lucy before build
**4. Pending nanny applications**
- Nannies who have submitted an application and are awaiting review
- Card shows applicant name, submission date, application stage
- Quick link to full applicant record
**5. Pending family applications**
- Families who have submitted an application and are awaiting approval
- Card shows family name, submission date
- Quick link to full family record
**6. Failed family payments**
- Families whose most recent billing cycle payment failed
- Card shows family name, amount, failure date
- Quick action to retry payment or flag for follow-up
---
 
## Section 4 — Analytics Page
 
Separate from the dashboard. This is where Lucy and David review platform health, revenue, booking activity, and growth — not urgent action items.
 
### Tab Structure
- **Overview** — single scrollable view of the most important metric from each group
- **Platform Health**
- **Revenue**
- **Bookings**
- **Growth**
### Platform Health Metrics
- Active family count (live)
- Active nanny count (live)
- Family-to-nanny ratio tracker (target: 1 family per 4 nannies — shows current ratio vs target)
- Family churn rate (families leaving per quarter)
- Nanny churn rate (approved nannies leaving per quarter)
### Revenue Metrics
- Monthly Recurring Revenue (MRR) — total subscription revenue per month
- Quarterly revenue — subscriptions plus booking fees
- Average revenue per family — total revenue divided by active families
- Failed payment rate — percentage of billing cycles hitting failures
### Booking Activity Metrics
- Total bookings this quarter (running count)
- Booking completion rate (confirmed vs cancelled)
- Unmatched booking rate (bookings with no nanny found — rising rate signals nanny supply shortage)
- Most booked nannies (workload distribution and star performer visibility)
- Recurring booking count (retention signal — families committed to recurring slots)
### Growth & Acquisition Metrics
- New family applications per month
- New nanny applications per month
- Application approval rate (percentage of applicants passing review)
- Referral source breakdown (Google / Instagram / Friend / referral link — what's driving growth)
---
 
## Section 5 — Nannies Page
 
Full management of all nannies on the platform.
 
### Tab Structure
- **Active** — approved nannies currently in the network
- **Pending** — applications awaiting review
- **Inactive** — previously approved nannies who have left or been deactivated
- **Rejected** — applicants who were declined
### Individual Nanny Record (Admin View)
The admin view of a nanny profile is a superset of what families and nannies see. All layers are always visible regardless of the nanny's status.
 
**Public-facing layer (same as family/nanny view):**
- Profile photo
- Bio
- Intro video
- Badges (admin-verified and self-reported, color-coded)
- Weekly availability
- Families this nanny has worked with
**Admin-only layer (never visible to families or nannies):**
- Original application fields (name, experience, personal statement, referral source)
- Application status history (each stage and timestamp)
- Interview notes — free-text field for Lucy/David to log observations from the interview
- Interview question responses — structured log of how the nanny responded to specific questions
- Internal admin comments — ongoing notes visible only to admin
- Admin-verified badge assignment controls — Lucy/David assign verified badges here after interview
- Account controls — approve, reject, deactivate
---
 
## Section 6 — Families Page
 
Full management of all family accounts on the platform.
 
### Tab Structure
- **Active** — approved families currently using the platform
- **Pending** — applications awaiting approval
- **Inactive** — families who have left or been deactivated
- **Rejected** — applicants who were declined
### Individual Family Record (Admin View)
Same two-layer structure as nanny records.
 
**Public-facing layer:**
- Family photo
- Children's names, ages, interests
- Pets, allergies, special needs
- House rules and important notes
- Home address
- Contact information
**Admin-only layer (never visible to families or nannies):**
- Original application fields
- Internal admin notes and comments
- Full booking history
- Billing status and payment history
- Account controls — approve, reject, deactivate
---
 
## Section 7 — Bookings Page
 
Platform-wide view of every booking across all families and nannies.
 
### Filters
- Status (confirmed / pending / cancelled / open / unmatched)
- Date range
- Family name
- Nanny name
### Actions on Any Existing Booking
- Cancel booking
- Reassign to a different nanny
- Edit date, time, location, or notes
### Create Booking
- Accessible via "Create Booking" button on the Bookings page
- Manual form: select family, select nanny, set date and time, add notes
- Full admin override — no availability restrictions apply
- Admin is responsible for confirming with both parties via Messages or direct contact before creating
- Booking appears in both the family's and nanny's records immediately upon creation
---
 
## Section 8 — Billing & Accounting Page
 
Full financial management of the platform.
 
### Tab Structure
- **Overview** — single scrollable page showing all sections at once (quarterly review view)
- **Current Billing** — every family's live billing status, next charge date, running booking count, outstanding amount
- **Invoice History** — all past invoices across all families, searchable and downloadable per invoice
- **Accounting** — donation tracker, quarterly totals, Excel export
### Current Billing Tab
- Per-family billing cards showing: family name, next charge date, bookings this quarter, outstanding amount
- Actions: manually trigger invoice, retry failed payment
- Download full billing table as Excel spreadsheet
### Invoice History Tab
- Full log of all past invoices across all families
- Searchable by family name or date range
- Per-invoice PDF download
### Accounting Tab
**Quarterly donation tracker:**
- Current quarter donation amount (auto-calculated as 10% of quarter's revenue)
- "Mark as Donated" button
**Donation history log:**
- Full record of every past donation
- Fields: date donated, amount, quarter covered
- Included in Excel export
**Excel export:**
- Full billing table covering all families and all quarters
- Includes donation log
---
 
## Section 9 — Messages Page
 
Unified inbox for all platform communications.
 
### Layout
- Left panel: conversation list with contact name and last message preview
- Right panel: full conversation thread
- Filter toggle at top of left panel: **All / Families / Nannies**
- "New Message" button to initiate a conversation with any family or nanny
### Internal Reply Tracking (admin-only, never visible to families or nannies)
- When a reply is sent, admin selects who is replying: **Lucy** or **David**
- Sent message is tagged internally with the replier's name and timestamp
- Conversation thread shows admin side as: "Replied by Lucy — [timestamp]" or "Replied by David — [timestamp]"
- Families and nannies see only: "Admin Team" — no names exposed
**Open item: separate admin logins vs shared account — pending Lucy.**
- If separate logins are implemented, the system auto-tags the replier without a manual selection step
### Message Status Options
- **Unread** — not yet opened
- **Read** — opened but not yet replied
- **Replied** — response sent, tagged with replier
- **Mark as Unread** — manual option available on any read message; pushes it back to unread so neither Lucy nor David loses track of it
---
 
## Section 10 — Settings Page
 
Platform-wide configuration. Controls how the platform behaves — not who admin is.
 
### Account Management
- Lucy and David's login credentials
- Password change
- **Open item: separate admin logins vs shared account — pending Lucy**
### Email Templates
- View and edit all automated emails the platform sends
- Covers: approval emails, booking confirmations, invoice emails, rejection emails, status update emails
- Editable without developer involvement
### Badge Management
- Master list of all platform badges — admin-verified and self-reported
- Add, edit, or retire badges
- Changes reflect immediately on all nanny profiles and the setup wizard
### Platform Policies
- Where Lucy and David write and update the content shown on the Policies page for families and nannies
- Two sections: Little Lamb Policies (platform-wide) and role-specific policies (Family / Nanny)
- Editable without developer involvement
### Referral Link Controls
- Visibility into all active referral links across families and nannies
- Shows which link belongs to which user and referral attribution data
### Billing Configuration
- Flat subscription fee amount (currently $25/quarter)
- Per-booking fee amount (currently $1)
- Adjustable without developer involvement
### Calendly Integration
- Where the Calendly link for nanny interview scheduling is configured
- Updates everywhere automatically when changed (holding page email, status update emails)
---
 
## Section 11 — Settings (Family & Nanny User Types)
 
For completeness — Settings vs Profile distinction applied consistently across all user types.
 
### Family Settings
- Email notification preferences
- Password change
- Payment card management
- Account deactivation request
### Nanny Settings
- Email notification preferences
- Password change
- Account deactivation request
*(Profile content for families and nannies is documented in their respective flow documents.)*
 
---
 
## Section 12 — Admin Permissions Summary
 
| Action | Admin |
|--------|-------|
| Approve / reject nanny applications | ✓ |
| Approve / reject family applications | ✓ |
| Edit any nanny profile, bio, badges, availability | ✓ |
| Edit any family profile | ✓ |
| Assign admin-verified badges | ✓ |
| Create bookings on behalf of any family | ✓ |
| Cancel any booking | ✓ |
| Reassign any booking to a different nanny | ✓ |
| Edit any booking (date, time, location, notes) | ✓ |
| Manually trigger invoices | ✓ |
| Retry failed payments | ✓ |
| Mark donations as distributed | ✓ |
| Edit email templates | ✓ |
| Edit platform policies | ✓ |
| Edit badge master list | ✓ |
| Adjust platform fees | ✓ |
| View all messages across the platform | ✓ |
 
---
 
## Open Items (to confirm before build)
 
| Item | Why it matters |
|------|----------------|
| Same-day booking request card design | How Lucy & David action same-day requests — pending Lucy |
| Unmatched booking in-app assignment flow | Mechanism for assigning a nanny without going off-platform — pending Lucy + business logic |
| Nanny cancellation handling workflow | Full cancel policy, in-app flow, family replacement logic — pending Lucy + business logic |
| Nanny 48-hour self-cancel threshold | Whether nannies can cancel directly if booking is 48+ hours away — pending Lucy |
| Separate admin logins vs shared account | Affects reply tracking in Messages and account management in Settings — pending Lucy |
 
---
 
*This document covers the Admin user flow only. Family and Nanny flows are documented separately.*
*littlelambnannies.com · Santa Barbara, CA · Founded at Westmont College*

# Little Lamb Nannies — Family User Flow
**Version:** 1.1 — May 2026  
**Scope:** Family user type only  
**Status:** Confirmed, ready for wireframes  
**Site:** littlelambnannies.com  
 
---
 
## Overview
 
Little Lamb Nannies connects Santa Barbara families with pre-screened, admin-approved nannies. This document covers the complete family user flow — from first landing on the marketing homepage through every action available inside the main app. It is the source of truth for design and development of the family-facing experience.
 
---
 
## User Types (for context)
 
| Type | Description |
|------|-------------|
| **Family** | Parents/guardians who browse nannies, make bookings, and pay quarterly |
| **Nanny** | Pre-approved childcare professionals who manage availability and profiles |
| **Admin** | Lucy & David — full platform control, approvals, billing oversight |
 
---
 
## Section 1 — Pre-Login (Public-Facing)
 
### 1.1 Marketing Homepage
- Public-facing, no login required
- **Primary audience:** Families (front and center)
- **Secondary audience:** Nannies (subtle link — "For Nannies")
- **Navigation bar:** Logo (left) · "For Nannies" text link · "Log In" link · "Get Started" button (primary CTA)
- **Hero section:** Headline targeting families, trust subheadline, "Get Started" CTA button, secondary text link "Are you a nanny? Apply here"
- **How it works section:** 3-step family flow — Browse → Book → Enjoy
- **Trust section:** Background check and interview promise, Santa Barbara community focus
- **Nanny preview:** 2–3 nanny profile cards teased (real photos, badges)
- **Bottom CTA:** Second "Get Started" button
- **Footer:** Contact, About, For Nannies link, Login, legal links
### 1.2 Family Intermediate Info Page
- Reached by clicking "Get Started" from homepage
- Explains the platform in detail — how it works, vetting process, what families can expect
- Ends with a clear CTA: "Apply Now" leading to the application form
### 1.3 Nanny Intermediate Info Page (for reference)
- Reached by clicking "For Nannies" from homepage
- Separate page explaining the nanny experience
- Ends with a nanny application form CTA
- Not covered in detail in this document (nanny flow is separate)
---
 
## Section 2 — Signup & Approval
 
### 2.1 Family Application Form
Families complete one combined form that both creates their account and submits their application.
 
**Fields:**
- Full name
- Email address
- Password (account created here)
- Phone number
- Neighborhood / area in Santa Barbara
- Number of children and their ages
- Any special needs or notes
- How did you find us? (optional dropdown: Google / Instagram / Friend / Other — only shown if no referral link was used; suppressed when family arrives via referral link)
**On submission:**
- Account is created in a **pending** state
- Application is sent to admin (Lucy & David) for review
- Family can log in immediately but sees a holding/placeholder page
### 2.2 Pending Holding Page
- Shown every time a pending family logs in
- Message: application is under review, we'll notify you when approved
- No access to any other part of the app
**Early profile completion (optional):**
- Holding page displays a prompt: "Want to get a head start? Complete your profile now so you're ready the moment you're approved."
- Single **"Complete Your Profile"** button takes family into the setup wizard in voluntary mode
- Progress is saved — wizard resumes exactly where they left off post-approval
- All pre-completed steps are auto-filled and skipped in the post-approval wizard
### 2.3 Admin Review
- Admin sees all pending applications in their dashboard
- Admin clicks **Approve** or **Reject** for each applicant
**If approved:**
- Family receives an email notification that their account is live
- Next login skips the holding page and goes to the setup wizard
**If rejected:**
- Family receives an email notification
- Account remains inactive
---
 
## Section 3 — Post-Approval Onboarding (Setup Wizard)
 
After approval, the family's first login triggers a **guided setup wizard**. This must be completed in full before the family can access the dashboard or make any bookings. Progress is saved if they close the browser — they resume where they left off.
 
**Progress bar displayed throughout. Cannot skip steps.**
 
### Step 1 — Family Profile
- Family photo
- Kids' names, ages, and interests
- Pets (yes/no, details)
- Allergies or special needs
- House rules and important family notes
- Home address
### Step 2 — Contact Information
- Primary email (pre-filled, confirmed)
- Phone number
- Spouse / co-parent name and email
### Step 3 — Payment Card
- Add a payment card
- **Required** — cannot proceed without completing this step
- Card is stored for quarterly automatic billing
### Step 4 — Completion Screen
- "You're all set — welcome to Little Lamb"
- Single button: "Go to your Dashboard"
- Wizard never appears again after completion
---
 
## Section 4 — Main App Structure
 
### 4.1 Navigation
Left sidebar navigation. Persistent across all pages.
 
**Sidebar contents (top):**
- Little Lamb logo
- Family name + photo or initials
**Navigation items:**
- Dashboard (home)
- Calendar
- Bookings
- Our Nannies
- My Profile
- Billing
- Messages
- Policies
**Sidebar bottom:**
- Settings
- Log Out
---
 
### 4.2 Dashboard (Home Screen)
Landing screen after login for approved, fully set-up families.
 
**Summary cards:**
- Next upcoming booking — nanny name, date, time
- Bookings this quarter — running count
**Primary CTA:**
- "Book a Nanny" button — directs to Calendar page
**Recent messages preview:**
- Latest admin message with link to full Messages page
---
 
### 4.3 Calendar Page
Full scheduling view. Entry point for the calendar-first booking flow.
 
**View toggles:** Month / Week / Day / List
 
**Color coding:**
- Green = confirmed booking
- Amber = pending (awaiting nanny confirmation)
**Interactions:**
- Click any existing booking label → booking detail modal (view details, cancel)
- Drag on any open time slot → initiates booking flow (see Section 5.1)
---
 
### 4.4 Bookings Page
A separate list view of all bookings — more readable than the calendar alone.
 
**Each booking card shows:**
- Nanny name
- Date, start time, end time
- Home address
- Notes from the family
- Status (confirmed / pending / cancelled)
**Actions from booking card:**
- View full details
- Cancel booking (triggers email to nanny)
---
 
### 4.5 Our Nannies — Browse Page
Directory of all active nannies in the Little Lamb network.
 
**Each nanny card shows:**
- Photo or initials
- Name
- Badge icons (certifications and traits)
- Short bio excerpt (2 lines)
- Availability indicator (based on filter if active)
- "View Profile" button
- "Book this Nanny" button
**Filtering:**
- When arriving from the calendar drag flow — automatically filtered to nannies available for the selected time slot
- When browsing freely — all active nannies shown, no filter
---
 
### 4.6 Full Nanny Profile Page
Reached by clicking "View Profile" from any nanny card.
 
**Contents:**
- Full photo
- Full bio (up to 500 characters)
- Intro video (1 minute, self-recorded by nanny)
- Full badge list with labels
- Weekly availability grid
- "Book this Nanny" button
- "Request Outside Hours" button (if desired time is outside nanny's preset hours)
---
 
### 4.7 My Profile Page
Family's own profile — editable at any time after setup wizard completion.
 
**Editable fields:**
- Family photo
- Kids' names, ages, interests
- Pets
- Allergies or special needs
- House rules and important notes
- Home address
- Primary email and phone
- Spouse / co-parent name and email
---
 
### 4.8 Billing Page
Shows the family's financial history and current standing.
 
**Contents:**
- Number of bookings made this quarter (running count)
- History of all past invoices
- Invoice download (PDF) for each past quarter
**Billing model:**
- $25 flat platform subscription per quarter
- $1 fee per confirmed booking, accumulated throughout the quarter
- Automatically charged every 90 days from signup date
- PDF invoice emailed to family at end of each billing cycle
---
 
### 4.9 Messages Page
Two-way inbox. All conversations in one place.
 
**Conversation types:**
- Family ↔ Admin
- Family ↔ Nanny
**Layout:**
- Left panel: conversation list with name and last message preview
- Right panel: full conversation thread
- "New Message" button to start a conversation with admin or a specific nanny
---
 
### 4.10 Policies Page
Platform policies for families. Content determined by Lucy & David. Accessible from sidebar at all times.
 
---
 
## Section 5 — Booking Flows
 
### 5.1 Calendar-First Booking Flow
 
1. Family drags a time slot on the calendar
2. That time slot is saved as a placeholder on the calendar
3. Family is redirected to the Our Nannies page — **automatically filtered** to only show nannies available during that slot
4. Family browses full nanny profiles at their own pace
5. Family clicks "Select for [date/time]" on their chosen nanny
6. Family is returned to the calendar — booking is now filled in with the nanny
7. Confirmation modal appears: date, time, nanny name, address
8. Family clicks "Confirm Booking"
**Outcome depends on timing:**
- Within nanny's preset hours → auto-confirmed, nanny notified by email
- Outside nanny's preset hours → sent to nanny as a request to accept or decline
- Same-day booking → routed directly to admin for manual processing (see 5.4)
---
 
### 5.2 Nanny-First Booking Flow
 
1. Family goes to Our Nannies page and browses freely
2. Family clicks into a nanny's full profile — views bio, video, badges, availability grid
3. Two paths from the profile:
**Path A — Book within available hours:**
- Family clicks "Book this Nanny"
- Taken to calendar with that nanny pre-selected
- Family drags desired time slot
- Confirmation modal appears
- Family confirms → auto-confirmed if within nanny hours
**Path B — Request outside available hours:**
- Family clicks "Request Outside Hours"
- Modal appears with: requested date and time, preset message pre-written, option to edit message
- Family sends request
- Nanny receives notification and accepts or declines
- Family notified by email either way
---
 
### 5.3 Recurring Bookings
 
- During booking confirmation, family has the option: "Make this recurring"
- Family selects frequency (weekly is primary use case)
- Nanny gets priority on that time slot going forward
**Auto-cancel logic:**
- If a nanny changes their availability and it conflicts with an upcoming recurring booking, the system checks 48 hours in advance
- If a conflict is found, the recurring booking is auto-cancelled
- Family receives an email: "[Nanny Name]'s availability has changed — your recurring booking on [date] has been cancelled. Please rebook."
- Nanny is also notified of the cancellation
- The 48-hour window gives the family time to find another nanny
---
 
### 5.4 Same-Day Bookings
 
- Family can still place a same-day booking
- It does **not** go to the nanny directly
- It is routed to admin (Lucy & David) for manual processing
- Admin contacts the nanny to check availability
- Admin confirms or declines the booking
- Family is notified of the outcome by email
---
 
### 5.5 Cancellations
 
- Family can cancel any booking from the **Calendar page** (click the booking label → cancel) or from the **Bookings page** (click booking card → cancel)
- On cancellation, nanny is automatically notified by email
- Cancelled bookings remain visible in booking history with a cancelled status
---
 
## Section 6 — Automated Emails
 
The platform sends the following emails automatically. No manual action required.
 
| Event | Recipient | Content |
|-------|-----------|---------|
| Application approved | Family | Account is live, next steps |
| Application rejected | Family | Application update |
| Booking auto-confirmed | Family + Nanny | Date, time, location, details |
| Booking sent as request (outside hours) | Family + Nanny | Family: awaiting reply. Nanny: accept or decline. |
| Nanny accepts booking request | Family | Booking is now confirmed |
| Nanny declines booking request | Family | Please rebook with another nanny |
| Recurring booking auto-cancelled | Family + Nanny | Availability conflict, please rebook |
| Same-day booking outcome | Family | Confirmed or not possible |
| Quarterly invoice generated | Family | Invoice for the period, PDF attached |
| Payment fails | Family | Action required — update payment method |
 
---
 
## Section 7 — What Is NOT in the App
 
- Nanny wages — families pay nannies directly (cash, Venmo, etc.)
- Background checks and interviews — handled offline before approval
- Non-circumvention agreements — handled outside the platform
- Push notifications — email only for now; push notifications planned for future mobile app
---
 
## Section 7 — Referral System
 
- Every family account has a unique referral link they can share to refer other families or nannies
- When someone signs up via a referral link, the source is automatically tagged in the admin dashboard ("Referred by [Family Name]")
- No rewards or incentive program — lightweight attribution only
- If a new applicant arrives without a referral link, they see a simple optional dropdown: Google / Instagram / Friend / Other
---
 
## Section 8 — Reviews
 
- After any booking date passes, a review card appears on the family's dashboard
- Card persists until the family acts on it
- Two options: **"Leave a Review"** or **"Skip"**
- If skipped, card disappears for that booking — review can still be submitted from the Bookings page at any time
- All reviews submitted to **admin only** — never public-facing
- No email prompts for reviews — dashboard card is the only nudge
- Purpose: gives Lucy & David ground-level insight into match quality and platform health
---
 
## Open Items (to confirm before build)
 
| Item | Why it matters |
|------|----------------|
| Final badge list for nanny profiles | Determines what traits/certs nannies display |
| Email provider (SendGrid vs Resend) | Required before any automated emails can be set up |
| Invoice visual design / branding | PDF invoice needs to match Little Lamb brand |
| Policies page content | What policies appear and in what order |
 
---
 
*This document covers the Family user flow only. Nanny and Admin flows are documented separately.*  
*littlelambnannies.com · Santa Barbara, CA · Founded at Westmont College*

# Little Lamb Nannies — Nanny User Flow
**Version:** 1.0 — May 2026
**Scope:** Nanny user type only
**Status:** Confirmed, ready for wireframes
**Site:** littlelambnannies.com
 
---
 
## Overview
 
Little Lamb Nannies connects Santa Barbara families with pre-screened, admin-approved nannies. This document covers the complete nanny user flow — from first landing on the marketing homepage through every action available inside the main app. It is the source of truth for design and development of the nanny-facing experience.
 
---
 
## User Types (for context)
 
| Type | Description |
|------|-------------|
| **Family** | Parents/guardians who browse nannies, make bookings, and pay quarterly |
| **Nanny** | Pre-approved childcare professionals who manage availability and profiles |
| **Admin** | Lucy & David — full platform control, approvals, billing oversight |
 
---
 
## Section 1 — Pre-Login (Public-Facing)
 
### 1.1 Marketing Homepage
- Public-facing, no login required
- **Primary audience:** Families (front and center)
- **Secondary audience:** Nannies — visible, dedicated entry point (not buried)
- **Navigation bar:** Logo (left) · "For Nannies" text link · "Log In" link · "Get Started" button (primary CTA for families)
- **Hero section:** Secondary text link "Are you a nanny? Apply here" visible below primary family CTA
- **Footer:** Contact, About, For Nannies link, Login, legal links
### 1.2 Nanny Intermediate Info Page
- Reached by clicking "For Nannies" or "Apply here" from homepage
- Dedicated nanny-facing landing page — distinct from the family info page
- **Content covers:**
  - Benefits of joining the Little Lamb network
  - How the vetting and approval process works
  - What the platform experience looks like for nannies once approved
  - Santa Barbara community focus
- Ends with a single clear CTA: **"Apply Now"** leading to the nanny application form
---
 
## Section 2 — Signup & Approval
 
### 2.1 Nanny Application Form
Nannies complete one combined form that both creates their account and submits their application to admin for review.
 
**Fields:**
- Full name
- Email address
- Password (account created here)
- Phone number
- Years of childcare experience
- A short personal statement
- Referral attribution (auto-tagged if arrived via referral link; if no referral link, a simple optional dropdown: Google / Instagram / Friend / Other)
**Note:** Final field list to be confirmed with Lucy before build.
 
**On submission:**
- Account is created in a **pending** state
- Application lands in the admin dashboard for Lucy & David to review
- Nanny can log in immediately but sees the holding page
- Automated email fires immediately: "We've received your application"
### 2.2 Pending Holding Page & Application Status
 
The holding page serves two purposes: communicating application status and giving nannies the option to begin profile setup early.
 
**Status progress bar** — displays current stage of the review process:
1. Application Received
2. Under Review
3. Interview Scheduled
4. Decision Made
Admin advances the status via a single button click in the admin dashboard. Each status advancement automatically:
- Updates the nanny's progress bar
- Fires an automated email notifying the nanny of the update
**Interview scheduling:**
- When admin advances to "Interview Scheduled," the automated email includes a Calendly link (Lucy & David's calendar)
- Nanny self-selects an available interview slot — no manual back-and-forth required
**Early profile completion (optional):**
- Holding page displays a prompt: "Want to get a head start? Complete your profile now so you're ready the moment you're approved."
- Single **"Complete Your Profile"** button takes nanny into the setup wizard in voluntary mode
- Progress is saved — wizard resumes exactly where they left off post-approval
- All pre-completed steps are auto-filled and skipped in the post-approval wizard
### 2.3 Admin Review
- Admin sees all pending nanny applications in their dashboard
- Admin advances application status via button controls (see 2.2)
- Admin clicks **Approve** or **Reject** at the Decision Made stage
**If approved:**
- Nanny receives approval email — account is live
- Next login: if wizard is already complete, nanny goes directly to dashboard; if not, wizard launches and requires completion before dashboard access
**If rejected:**
- Nanny receives rejection email
- Account remains inactive
---
 
## Section 3 — Post-Approval Onboarding (Setup Wizard)
 
After approval, if the nanny has not already completed the wizard during the pending phase, their first login triggers the **guided setup wizard**. This must be completed in full before dashboard access is granted. Progress is saved if they close the browser — they resume where they left off.
 
**Progress bar displayed throughout. Cannot skip steps.**
 
### Step 1 — Profile Photo & Bio
- Profile photo (required)
- Bio — up to 500 characters
- Short personal introduction covering experience, approach to childcare, and fit for Santa Barbara families
### Step 2 — Intro Video
- Self-recorded video — maximum 1 minute
- A prompt is provided on screen to guide content: name, years of experience, brief personal introduction
- **Required** — cannot proceed without uploading
- Goes live immediately upon upload — no admin review required
- Ensures every nanny profile has a consistent, personal presence for families
### Step 3 — Badges
- Nanny selects applicable badges from a provided list
- **Two badge types with distinct visual styling (color-coded):**
  - **Admin-verified badges** (e.g. CPR Certified, First Aid Certified) — assigned or confirmed by Lucy & David; displayed in one color
  - **Self-reported badges** (e.g. Pet-Friendly, Ages 0–2, Ages 3–7, Ages 8–12) — selected by nanny; displayed in a second color
- Admin-verified badges are assigned separately by admin after interview; nanny selects self-reported badges here
- Final badge list to be confirmed with Lucy before build
### Step 4 — Weekly Availability
- Nanny sets their general recurring weekly schedule
- For each day of the week: set a start time and end time (e.g. Monday–Friday, 3:00 PM–8:00 PM)
- Days with no availability are left off
- This data powers the booking system and calendar availability display
### Step 5 — Completion Screen
- "You're all set — welcome to Little Lamb"
- Single button: "Go to your Dashboard"
- Wizard never appears again after completion
---
 
## Section 4 — Main App Structure
 
### 4.1 Navigation
Left sidebar navigation. Persistent across all pages. Identical layout to family sidebar with billing removed.
 
**Sidebar contents (top):**
- Little Lamb logo
- Nanny name + photo or initials
**Navigation items:**
- Dashboard (home)
- Calendar
- Bookings
- Our Nannies
- My Profile
- Messages
- Policies
**Sidebar bottom:**
- Settings
- Log Out
---
 
### 4.2 Dashboard (Home Screen)
Landing screen after login for approved, fully set-up nannies.
 
**Summary cards:**
- Next upcoming booking — family name, date, time
- Pending booking requests — count of bookings awaiting accept/decline
- Open bookings — unmatched family requests the nanny can pick up (see Section 5.3)
- Availability status at a glance — summary of current weekly availability
**Review prompt cards:**
- After any booking date passes, a review card appears on the dashboard
- Card persists until the nanny acts on it
- Two options: **"Leave a Review"** or **"Skip"**
- If skipped, card disappears for that booking — review can still be submitted later from the Bookings page
- All reviews go to admin only — never public-facing
**Recent messages preview:**
- Latest message with link to full Messages page
---
 
### 4.3 Calendar Page
Full scheduling view. Primary tool for managing availability.
 
**View toggles:** Month / Week / Day / List
 
**Three slot states:**
- **Empty** = unavailable (default — nanny starts with a completely empty calendar)
- **Available** = nanny has opened this slot (dragged open or set in My Profile)
- **Booked** = a confirmed family booking exists for this slot — displays "Booked — [Family Name]"
**Color coding:**
- Green = available slot
- Blue/filled = booked slot (exact color TBD with brand)
- Booked slots are locked — cannot be removed or edited by nanny
**Availability interactions:**
- **Drag to add availability** — nanny drags on any empty time slot to mark themselves available
- **Click to remove availability** — nanny can remove an available (unbooked) slot at any time
- Business logic around how far in advance availability can be removed: **TBD — confirm with Lucy**
**Booking visibility:**
- When a family confirms a booking, the slot automatically updates to "Booked — [Family Name]"
- Booked slots are visible to other families as unavailable when browsing or attempting to book
---
 
### 4.4 Bookings Page
A list view of all bookings — past, present, and upcoming.
 
**Each booking card shows:**
- Family name
- Date, start time, end time
- Home address
- Notes left by the family about the children
- Status (confirmed / pending / cancelled)
**Actions from booking card:**
- View full details
- Accept or decline (if booking is pending — outside preset available hours)
- Leave a review for a past booking (accessible at any time, even after skipping the dashboard prompt)
**Booking history:**
- Full log of all past completed bookings visible to nanny
- Shows family name, date, time, and duration
- No financial data displayed — pay is handled privately between family and nanny
---
 
### 4.5 Our Nannies — Browse Page
Directory of all active nannies in the Little Lamb network.
 
**Identical view to the family-facing Our Nannies page with one difference:**
- Booking buttons ("Book this Nanny") are hidden for nanny users
- All other functionality is the same — nannies can browse profiles, view bios, watch intro videos, see badges and availability
**Purpose:**
- Gives nannies visibility into the community they are part of
- Supports the community-first platform identity
---
 
### 4.6 Full Nanny Profile Page (Viewing Other Nannies)
Reached by clicking "View Profile" from any nanny card.
 
**Contents (same as family view):**
- Full photo
- Full bio
- Intro video
- Full badge list with color-coded labels (admin-verified vs self-reported)
- Weekly availability grid
- List of families this nanny has worked with (community trust signal)
**Booking buttons not shown** for nanny users.
 
---
 
### 4.7 My Profile Page
Nanny's own profile — editable at any time after setup wizard completion.
 
**Editable fields:**
- Profile photo
- Bio (up to 500 characters)
- Intro video (re-upload at any time)
- Self-reported badges
- Weekly availability (manual hardcoded hours — syncs with calendar)
**Admin-verified badges:**
- Displayed on profile but not editable by nanny
- Assigned by Lucy & David through the admin panel
**Profile completeness indicator:**
- A quiet progress indicator lives on the My Profile page
- Shows which profile elements are complete and which are missing or outdated
- Not shown on the dashboard — exists only as an ongoing nudge on the profile page itself
**Families this nanny has worked with:**
- A list of all families the nanny has completed bookings with
- Visible to other families browsing the nanny's profile
- Community visibility is open by default — no opt-in required
**Availability section:**
- Manual weekly schedule input — set recurring hours by day (e.g. Monday 3:00 PM – 8:00 PM)
- Syncs directly with the calendar view
- Alternative to drag-and-drop calendar availability management
---
 
### 4.8 Messages Page
Two-way inbox. All conversations in one place.
 
**Conversation types:**
- Nanny ↔ Admin (nanny can initiate at any time)
- Nanny ↔ Family (nanny can only initiate if a previous completed booking exists with that family)
**Layout:**
- Left panel: conversation list with name and last message preview
- Right panel: full conversation thread
- "New Message" button — available contacts determined by messaging rules above
---
 
### 4.9 Policies Page
Platform policies for nannies. Accessible from sidebar at all times.
 
**Structure:**
- **Little Lamb Policies** (top section) — shared platform-wide rules: general conduct, community expectations, platform rules
- **Nanny Policies** (bottom section) — nanny-specific: cancellation obligations, conduct expectations, platform rules for nannies
Content determined by Lucy & David before launch.
 
---
 
## Section 5 — Availability & Booking Logic
 
### 5.1 Setting Availability
Nannies have two methods to manage their availability — both sync to the same underlying data:
 
**Method A — Calendar drag-and-drop:**
- Nanny drags on any empty time slot to mark it as available
- Nanny clicks any available (unbooked) slot to remove availability
- Fast and visual — best for one-off date adjustments
**Method B — My Profile weekly schedule:**
- Nanny sets recurring weekly hours by day
- Best for establishing a consistent ongoing schedule
- Changes here reflect immediately on the calendar
### 5.2 How Bookings Appear for Nannies
 
**Auto-confirmed bookings:**
- Family books within nanny's preset available hours
- Booking appears immediately as confirmed on nanny's calendar and bookings list
- Nanny notified by email + calendar invite sent
**Pending booking requests:**
- Family books outside nanny's preset available hours
- Booking appears with "Pending your reply" status
- Nanny sees Accept and Decline buttons on the booking card
- Accepting → booking confirmed, family notified by email + calendar invite sent to both
- Declining → booking removed from nanny's list, family notified by email to rebook
**Business logic TBD (confirm with Lucy):**
- How far in advance a family can book
- Time-based approval thresholds
- Nanny obligation logic for bookings made within certain time windows
### 5.3 Open Bookings
- When a family cannot find an available nanny for their requested time, the booking enters an open/unmatched state
- Open bookings surface on the nanny's dashboard as a dedicated card
- Nanny reviews the open booking details (family, date, time, location)
- If the time works for them, nanny clicks **Accept**
- Booking is immediately confirmed — family notified by email + calendar invite sent to both
- No admin mediation required
### 5.4 Recurring Bookings
- Families initiate recurring bookings — nanny receives notification
- Recurring slot is held for that family going forward
- If nanny changes availability conflicting with a recurring booking, system detects conflict 48 hours in advance
- Recurring booking instance is auto-cancelled
- Both nanny and family notified by email
- Family has 48-hour window to find alternative coverage
### 5.5 Nanny Cancellations
**TBD — confirm with Lucy before build.**
 
Open items:
- Can nannies cancel directly through the app or must they go through admin
- What happens to the family when a nanny cancels (auto-replacement logic under discussion)
- Cancellation tracking and threshold flags for repeat cancellers
- Emergency same-day cancellation handling
---
 
## Section 6 — Referral System
 
- Every nanny account has a unique referral link
- Nanny can share their referral link to refer other nannies or families to the platform
- When someone signs up via a referral link, the source is automatically tagged in the admin dashboard ("Referred by [Nanny Name]")
- No rewards or incentive program — lightweight attribution only
- Admin uses referral data to identify strongest community connectors and track growth channels
- If a new applicant arrives without a referral link, they see a simple optional dropdown: Google / Instagram / Friend / Other
---
 
## Section 7 — Reviews
 
- After any booking date passes, both the nanny and the family are prompted to leave a review
- Review prompt appears as a card on the dashboard — persists until acted on
- Nanny can **Leave a Review** or **Skip**
- If skipped, card disappears — review can still be submitted from the Bookings page at any time
- All reviews submitted to **admin only** — never public-facing
- No email prompts for reviews — dashboard card is the only nudge
- Purpose: gives Lucy & David ground-level insight into match quality and platform health
---
 
## Section 8 — Automated Emails & Notifications
 
The platform sends the following emails automatically. No manual action required unless noted.
 
| Event | Recipient | Content |
|-------|-----------|---------|
| Application received | Nanny | Confirmation that application is under review |
| Application status updated | Nanny | Current stage update (auto-fires when admin advances status) |
| Interview scheduled | Nanny | Status update + Calendly link to book interview slot |
| Application approved | Nanny | Account is live, next steps |
| Application rejected | Nanny | Application update |
| Booking auto-confirmed | Nanny + Family | Date, time, location, details + calendar invite |
| Booking request received (outside hours) | Nanny | Please accept or decline |
| Nanny accepts booking request | Family | Booking is now confirmed + calendar invite |
| Nanny declines booking request | Family | Please rebook with another nanny |
| Open booking picked up by nanny | Family | Booking confirmed + nanny details + calendar invite |
| Recurring booking auto-cancelled | Nanny + Family | Availability conflict, please rebook |
| New message received | Nanny | Message notification |
| Nanny cancellation | Family | TBD — pending cancellation policy decision |
 
**Calendar invites:**
- Sent to both nanny and family on any booking confirmation
- Contains: date, start/end time, family name, home address
- Compatible with Google Calendar, Apple Calendar, and Outlook (iCal format)
- Cancellation notice sent to remove event if booking is cancelled
- Calendar API choice (Google Calendar API vs iCal): TBD — confirm before build
---
 
## Section 9 — What Is NOT in the App
 
- Nanny wages — families pay nannies directly (cash, Venmo, etc.) — not handled or facilitated by Little Lamb
- Time tracking / clock in-clock out — hours worked are between the family and nanny
- Background checks and interviews — handled offline before approval; app reflects outcome only
- Non-circumvention agreements — handled outside the platform
- Push notifications — email only for now; planned for future mobile app version
---
 
## Open Items (to confirm before build)
 
| Item | Why it matters |
|------|----------------|
| Final nanny application form fields | Confirm with Lucy before build |
| Final badge list | Determines what traits/certs nannies can display — confirm with Lucy |
| Brand colors for admin-verified vs self-reported badges | Visual differentiation system needs brand color assignment |
| Booking/cancellation timing business logic | How far in advance bookings can be made, approval thresholds, nanny obligation windows |
| Nanny cancellation flow | Direct cancel vs. admin-mediated; family replacement logic; repeat canceller tracking |
| Emergency same-day cancellation handling | Linked to cancellation flow — confirm with Lucy |
| Policies page content | What nanny-specific and shared policies appear — confirm with Lucy |
| Email provider (SendGrid vs Resend) | Required before any automated emails can be set up |
| Calendar API (Google Calendar API vs iCal) | Required before calendar invite feature can be built |
| Calendly account setup | Required for interview scheduling link in status emails |
 
---
 
*This document covers the Nanny user flow only. Family and Admin flows are documented separately.*
*littlelambnannies.com · Santa Barbara, CA · Founded at Westmont College*
 
# **What is Little Lamb Nannies?**
 
Little Lamb Nannies is a website that connects Santa Barbara families with trusted, pre-screened nannies. Think of it like a matchmaking service — families find and book nannies through the site, and nannies use the site to manage their schedule and present themselves to potential clients.
 
Little Lamb is not a staffing agency. It does not employ nannies or handle their wages. Families and nannies work out pay arrangements privately. What Little Lamb does is make the discovery, scheduling, and trust-building process easy and professional.
 
| **The core promise to families:** Every nanny in our network has passed a background check and a personal interview before their profile ever goes live. Families can book with confidence. |
| --- |
 
| **The core promise to nannies:** A professional platform to showcase your experience, manage your availability, and grow your client base in the Santa Barbara community. |
| --- |
 
**SECTION 2**
 
# **Who uses the app?**
 
There are three types of people who log in to the Little Lamb website. Each has their own separate area after logging in.
 
**Families**
 
Parents and guardians in Santa Barbara who need childcare. They use the app to browse nanny profiles, book sessions, view their schedule, and pay their quarterly bill.
 
**Nannies**
 
Childcare professionals who have been interviewed and approved by the Little Lamb team. They use the app to see their upcoming bookings, set when they are available, and build out their profile so families can get to know them.
 
**Admin (David ****&**** Lucy)**
 
The Little Lamb founders. They have access to everything — approving new nannies, viewing all bookings across the platform, managing billing for families, and stepping in to help anyone who needs it.
 
| **Feature** | **For Families** | **For Nannies** |
| --- | --- | --- |
| **Signing up** | Fill in name, email, and password. Select "I am a Family." | Apply online. The Little Lamb team reviews and approves before the profile goes live. |
| **Home screen** | A monthly calendar showing all upcoming nanny bookings. | A list of upcoming bookings — who they are watching, when, and where. |
| **Making a booking** | Pick a date and time, choose a nanny, and confirm. | Not applicable — families initiate all bookings. |
| **Finding a nanny** | Browse nanny profiles, read bios, watch intro videos, and view availability. | Not applicable from the family side. |
| **Payments** | Billed once per quarter — flat fee plus a small fee per booking. | Nannies are never charged. Pay is handled privately between family and nanny. |
| **Notifications** | Email when a booking is confirmed or changes. | Email when a new booking is assigned or needs a reply. |
 
**SECTION 3**
 
# **Logging in**
 
Everyone — families, nannies, and the admin team — enters the site through the same login page at littlelambnannies.com. There is one login page, not separate websites for each group.
 
Here is what the login screen looks like and does:
 
| **#** | **Step** | **What happens** |
| --- | --- | --- |
| **1** | **Choose your role** | At the top of the login screen, you tap either "I am a Family" or "I am a Nanny." This tells the site who you are. |
| **2** | **Enter your email and password** | Standard email and password login. Nothing unusual here. |
| **3** | **The site routes you correctly** | Based on your account type, the site automatically sends you to the right place — families go to the calendar, nannies go to their bookings, and admin goes to the dashboard. |
 
| **First time signing up?** New families and nannies can create an account from the same page. Families are active immediately after signing up. Nannies are placed in a "pending" state until David or Lucy reviews and approves their application. |
| --- |
 
**SECTION 4**
 
# **The Family Experience**
 
After logging in, families land on their personal calendar. This is the center of everything they do on the site.
 
## **The Calendar — Home Screen**
 
The calendar shows the current month. Every booking a family has made appears as a colored label on the correct day. At a glance, a parent can see their entire childcare schedule.
 
- Green labels mean the booking is confirmed — the nanny has accepted and it is happening.
 
- Amber labels mean the booking is pending — the nanny has not yet confirmed.
 
Families can click any label on the calendar to see the full details of that booking — the nanny's name, start and end time, home address, and any notes. From that same view, they can cancel a booking if needed.
 
## **Booking a Nanny**
 
Booking a nanny takes three steps and should feel similar to booking an appointment online. A family can start a booking two ways: by clicking the green "Book a nanny" button at the top right, or by clicking directly on any open day on the calendar.
 
| **#** | **Step** | **What happens** |
| --- | --- | --- |
| **1** | **Pick the date and time** | Select the date, a start time, and an end time. The home address is pre-filled from the family's account. There is also an optional notes box — for example, "Kids need dinner at 6pm" or "Baby is on a two-hour nap schedule." |
| **2** | **Choose a nanny** | The site shows a list of nannies who are available during that time. Each card shows the nanny's name, their skill badges, and a short excerpt from their bio. Families can also browse all nannies first and book directly from a nanny's profile page. |
| **3** | **Confirm** | A summary screen shows all the details. The family hits "Confirm booking" and it is done. |
 
| **What happens after confirming?** If the booking falls within the nanny's set available hours, it is confirmed automatically — no waiting. If it falls outside those hours, it goes to the nanny as a request to accept or decline. Either way, the family gets an email confirmation right away. |
| --- |
 
## **Browsing Nanny Profiles**
 
From the sidebar, families can navigate to "Our nannies" — a page that shows all active nannies in the network. Each nanny has a profile card with:
 
- Their photo or initials
 
- Small circular badges representing their certifications and traits (e.g., CPR certified, pet-friendly, experienced with ages 3–7)
 
- A short excerpt from their personal bio
 
- A button to view their full profile
 
On the full profile page, families can watch a short one-minute intro video the nanny recorded themselves. This gives families a chance to see the nanny's personality and communication style before ever meeting in person. The profile also shows the nanny's weekly availability as a simple grid.
 
## **Billing**
 
Families have a billing page in their account that shows their current charges clearly. There are two components to the quarterly bill:
 
- A flat platform subscription of $25 per quarter.
 
- A small $1 fee per booking, which accumulates throughout the quarter.
 
The billing page shows how many bookings have been made in the current quarter, the estimated total for the next bill, and a history of all past invoices. Invoices can be downloaded as PDF files directly from the site. When a billing cycle ends, a PDF invoice is also emailed to the family automatically.
 
**SECTION 5**
 
# **The Nanny Experience**
 
After logging in, nannies land on their bookings page. Their portal is focused on three things: seeing their schedule, managing their availability, and keeping their profile up to date.
 
## **My Bookings**
 
The bookings page is a clean list of all upcoming sessions, sorted by date. Each booking card shows everything a nanny needs to know:
 
- The family's name
 
- The date, start time, and end time
 
- The home address
 
- Any notes the family left about the children
 
If a booking was made during a nanny's set available hours, it appears as confirmed automatically. If a family booked outside those hours, the booking appears with an amber "Pending your reply" label and shows two buttons: Accept and Decline.
 
| **Accepting or declining a booking:** Tapping Accept confirms the booking and automatically notifies the family by email. Tapping Decline removes the booking from the nanny's list and emails the family so they can rebook with another nanny. |
| --- |
 
## **My Availability**
 
Nannies set their general weekly schedule once, and it stays saved until they change it. The availability page has two parts:
 
- Weekly schedule: For each day of the week, a nanny can set a start time and end time (for example, Monday through Friday, 3:00 PM to 8:00 PM). Days with no availability are simply left off.
 
- Extra available dates: Nannies can also mark specific one-off dates they are available — for example, a Saturday they do not usually work but happen to be free.
 
This availability information is what the booking system uses to decide whether to auto-confirm a booking or send it as a request.
 
## **My Profile**
 
The profile page is where nannies build the presence that families see. It has three parts:
 
| **#** | **Step** | **What happens** |
| --- | --- | --- |
| **1** | **Bio** | A short written introduction — up to 500 characters. This is the nanny's chance to describe their experience, their approach to childcare, and what makes them a great fit for families in Santa Barbara. |
| **2** | **Intro video** | A short video — no longer than one minute — that the nanny records and uploads themselves. It plays directly on their profile page. The goal is for families to hear the nanny's voice and get a feel for their personality before booking. |
| **3** | **Badges** | A set of circular badges that appear on the profile and in search results. Nannies select which ones apply to them by checking boxes. Examples include: CPR certified, First Aid certified, Pet-friendly, and age-range preferences like Ages 3–7. |
 
| **Note for pending nannies:** A nanny can set up their full profile — bio, video, and badges — before they are approved. Their profile simply will not be visible to families until the Little Lamb team gives the green light. |
| --- |
 
**SECTION 6**
 
# **The Admin Experience (David ****&**** Lucy)**
 
The admin portal is a private area only David and Lucy can access. It gives them full visibility and control over everything happening on the platform — no technical knowledge needed to use it day to day.
 
## **Overview Dashboard**
 
The first screen after logging in as admin is a summary of the platform at a glance:
 
- How many active families are on the platform
 
- How many active nannies are in the network
 
- How many bookings have been made this quarter
 
- Total revenue for the quarter
 
Below the summary cards is a ratio tracker showing the current family-to-nanny ratio. The business target is one family for every four nannies. The tracker shows whether the platform is near that target, below it, or above it — so David and Lucy know when to bring on more nannies or open up to more families.
 
Also on this screen is a table of all pending nanny applications — people who have signed up and are waiting for approval. For each applicant, the admin can click Approve or Reject.
 
## **Managing Nannies**
 
The nannies section shows every nanny on the platform — active, pending, rejected, or inactive. Admin can:
 
- Approve or reject pending applications
 
- View and edit any nanny's profile, bio, or badges
 
- Update a nanny's availability on their behalf
 
- Deactivate a nanny if they leave the network
 
All edits take effect immediately and are visible to families right away.
 
## **Managing Families**
 
The families section shows every family account. Clicking on a family shows their full history: all their bookings, their billing status, and their account details. From this view, admin can also create a booking on behalf of a family — useful if a family calls in and needs help placing a booking.
 
## **All Bookings**
 
This page shows every booking made across the entire platform — past, present, and upcoming. Admin can filter by status (confirmed, pending, cancelled), date range, or search by a family or nanny's name. From this view, admin can:
 
- Cancel any booking
 
- Reassign a booking to a different nanny
 
- Edit the date, time, location, or notes on any booking
 
| **Admin override:** The admin team has full override access. If anything on the platform needs to be adjusted — for any reason — David or Lucy can make the change directly without needing a developer. |
| --- |
 
## **Billing ****&**** Accounting**
 
The billing page gives David and Lucy a complete financial picture of the business. It shows every family's billing status, their next charge date, how many bookings they have made this quarter, and their total outstanding amount.
 
From this page, admin can:
 
- Manually trigger an invoice for any family if needed
 
- Retry a failed payment
 
- Download the entire billing table as an Excel spreadsheet for their records
 
The accounting dashboard also shows a running total of the 10% donation amount owed to Santa Barbara nonprofits each quarter, with a simple button to mark it as donated once it has been distributed.
 
**SECTION 7**
 
# **How Billing Works — Plain English**
 
Billing is automatic and requires no action from families on a day-to-day basis. Here is how it works from start to finish:
 
| **#** | **Step** | **What happens** |
| --- | --- | --- |
| **1** | **Family signs up** | A payment card is added to the family's account during setup. The billing clock starts the day they join. |
| **2** | **Bookings accumulate** | Every time a family makes a confirmed booking, a $1 fee is quietly tracked in the background. Families can see the running total on their billing page at any time. |
| **3** | **Quarterly billing** | Every 90 days from their signup date, the family is automatically charged: $25 subscription plus the total booking fees from that quarter. |
| **4** | **Invoice delivered** | A PDF invoice is automatically generated and emailed to the family. It shows a line-by-line breakdown: the subscription, the number of bookings, the fees, and the total. |
| **5** | **Invoice stored** | The invoice also appears inside the family's billing page on the website, where it can be downloaded at any time. |
 
| **Nannies are never charged:** All platform fees are paid by families only. Nanny wages are a private matter between the family and the nanny and are not handled by Little Lamb. |
| --- |
 
**SECTION 8**
 
# **Emails the Platform Sends Automatically**
 
The platform sends emails automatically for every important event. No one needs to send these manually. Here is a full list of when emails go out and to whom:
 
| **Event** | **Who receives it** | **What it says** |
| --- | --- | --- |
| Booking confirmed automatically | **Family + Nanny** | Booking details — date, time, location |
| Booking sent as a request (outside nanny hours) | **Family + Nanny** | Family: awaiting reply. Nanny: please accept or decline. |
| Nanny accepts a booking request | **Family** | Booking is now confirmed |
| Nanny declines a booking request | **Family** | Please rebook with another nanny |
| Nanny application approved | **Nanny** | Welcome — your profile is now live |
| Nanny application rejected | **Nanny** | Application update |
| Quarterly invoice generated | **Family** | Invoice for the period, PDF attached |
| Payment fails | **Family** | Action required — update payment method |
 
**SECTION 9**
 
# **What is Not in the App**
 
To keep the platform simple and legally clean, a few things are intentionally handled outside of Little Lamb:
 
- Nanny wages. Families pay nannies directly — by cash, Venmo, or whatever they agree on. Little Lamb does not touch these payments.
 
- Background checks and interviews. These happen offline before a nanny is approved. The app does not run the checks itself — it just reflects the outcome (approved or not).
 
- Non-circumvention agreements. The legal agreements between Little Lamb and its users are handled outside the platform.
 
- Push notifications. For now, all notifications are sent by email. Push notifications (the kind that pop up on a phone screen) are planned for a future mobile app version.
 
**SECTION 10**
 
# **Items to Confirm Before Launch**
 
A few business decisions are still open and need to be finalized before the build is complete. These do not block the design or most of the development, but they will need answers before the site can go live.
 
| **Action required from David ****&**** Lucy:** Please review the items below and provide answers so the development team can finalize the remaining features. |
| --- |
 
| **Open item** | **Why it matters** |
| --- | --- |
| **Final badge list for nanny profiles** | Determines what traits and certifications nannies can display. Confirm with Lucy before nanny profiles are built. |
| **Email provider (SendGrid vs. Resend)** | Needed before any automated emails can be set up and tested. |
| **Invoice visual design** | The invoice PDF needs to match the brand. A simple template is planned — confirm if any specific details need to appear. |
| **Do nannies self-register or are accounts created by admin?** | This changes the signup flow. Currently the plan assumes nannies can sign themselves up and wait for approval. |
 
**Questions or feedback?**
 
This document will be updated as decisions are made and the build progresses. If anything in this walkthrough is unclear or needs to be changed, reach out to David and the updates will be reflected here.
 
littlelambnannies.com  ·  Santa Barbara, CA  ·  Founded at Westmont College


# Little Lamb Nannies — Logo Brief
**Version:** 1.0 — June 2026
 
---
 
## Brand Direction: "Warm Professional"
 
The brand should sit between a boutique children's brand and a trusted local service. Not a corporate app, not a playful daycare — curated, safe, and human. Think the kind of place a Santa Barbara mom would recommend to a friend over coffee.
 
---
 
## Visual Style: Modern Soft
 
Clean and minimal in structure, warmed up with rounded corners, soft weight, and a touch of illustration. Think Airbnb or Care.com but smaller-scale and more personal. The logo mark should feel gentle, not edgy.
 
**Icon concept:** A simple lamb silhouette — clean line-art, not cartoonish. Optionally set inside a soft circle or shield (signals trust without being heavy-handed). A lamb integrated into a subtle house or heart shape could also nod to in-home care.
 
---
 
## Typography
 
Rounded sans-serif wordmark — **Nunito**, **Poppins**, or **DM Rounded**. Modern and approachable without feeling childish. "Nannies" sits smaller below "Little Lamb" for visual hierarchy.
 
---
 
## Color Palette
 
| Role | Color | Notes |
|------|-------|-------|
| Primary | Soft sage green (~#7BAE8A) | Calm, safe, natural — distinctive in the childcare space |
| Background | Warm cream / off-white | Breathing room |
| Accent | Dusty terracotta or warm blush | Warm pop for CTAs and highlights |
| Text | Deep charcoal (not pure black) | Keeps the overall feel soft |
 
---
 
## Deliverables Requested
 
- Primary logo (wordmark + icon)
- Icon-only version
- Color palette
---
 
## Designer Text (ready to send)
 
> Hey! Working on a logo for a platform called **Little Lamb Nannies** — a Santa Barbara nanny-matching service. Going for a warm, modern, professional feel — not corporate, not cartoonish. Icon idea: a clean, simple lamb silhouette, optionally inside a soft circle. Typography: rounded sans-serif (Nunito or Poppins). Color palette: sage green as the primary, warm cream background, dusty terracotta or blush as an accent. Would love a primary logo, icon-only version, and a color palette. Let me know what you need from me!
 
---
 
*littlelambnannies.com · Santa Barbara, CA · Founded at Westmont College*
