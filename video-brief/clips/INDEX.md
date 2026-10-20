# Clip Index — real app footage

All clips are real recordings of the Little Lamb app running locally (Firebase emulators, seeded
demo data — nothing touches production). Recorded with Playwright at **viewport 1920×1080,
deviceScaleFactor 1, recordVideo 1920×1080** (true 1080p), trimmed to usable frames and encoded
H.264 / 30 fps / no audio. Mobile clips were recorded at the iPhone 14 Pro viewport and composited
on a 1920×1080 cream canvas (a 1080×1920 `-vertical.mp4` copy exists too).

- Profile pictures are hand-drawn illustrated avatars (DiceBear "notionists", CC0) — **not photos
  of real people**. Names, addresses and phone numbers are fictional (805-555-xxxx).
- A visible cursor dot was injected because headless browsers don't render one.
- Clips marked "sped" were time-compressed to stay ≤ 20 s; typing reads slightly quick but natural.
- Re-create: `npm run seed` → `node video-brief/tools/demo-photos.mjs` → `node video-brief/tools/record.mjs`
  → `python3 video-brief/tools/convert.py` (see the tool headers for env vars).

| File | Length | What it shows | Status | Script beat |
|---|---|---|---|---|
| `01-landing-hero.mp4` | 15.8 s | Public homepage: "Every nanny, *vetted* before you ever meet." Hover the trust chips, scroll through the trust strip (100% background-checked · 1-on-1 founder interview · 1-min intro) and "Three steps to your next sitter". | LIVE (public now) | 02 What is it |
| `02-meet-the-network.mp4` | 10.3 s | Homepage "Meet the network — *The kind of nanny you would recommend to a friend*" sample cards (labelled illustrative), then the closing "Ready to find someone you trust with the people you love most?" call to action and footer ("Founded at Westmont College"). | LIVE | 03 Problem |
| `03-family-apply.mp4` | 20.0 s (sped 1.47×) | A new family (Rebecca) fills in the application — name, email, phone, password, kids "ages 3 and 6", nap note, "how did you find us" — and submits; lands on "Thanks, Rebecca — we're reviewing your application" with the head-start prompt. | LIVE | 05 Application |
| `04-nanny-application-status.mp4` | 11.3 s | Pending nanny (Priya) sees her 4-stage tracker: Application received ✓ · Under review ✓ · Interview scheduled · Decision made, plus "Book your interview slot" and "Complete your profile". | LIVE (Calendly link is a placeholder — the button is hovered, not clicked) | 05 Application |
| `05-admin-dashboard.mp4` | 12.2 s | Admin (Lucy) dashboard: "Everything that needs your attention, in priority order" — unmatched bookings, cancellation queue, pending nanny and family applications with Approve / Reject. | LIVE | 06 Vetting |
| `06-admin-vetting.mp4` | 20.0 s (sped 1.07×) | Admin Nannies › Pending: advance Ella's stage, open Priya's verified-badge dialog, tick CPR / First Aid / Background Checked, save, then Approve. | LIVE | 06 Vetting |
| `07-family-dashboard.mp4` | 10.8 s | Family home: "Hello, Hartley Family", next booking, bookings this quarter, "How did it go?" review prompt, upcoming list, "Book a nanny". | LIVE | (spare / b-roll for 07–08) |
| `08-family-browse-nannies.mp4` | 14.1 s | "Our nannies" directory: avatar cards with Background-checked + experience chips, verified badges, age badges, bios; scroll through Sofia, Olivia, more. Hourly-rate guides ("from $25/hr") are visible — these are nanny rates, not Little Lamb fees. | LIVE | 07 Browse |
| `09-nanny-profile.mp4` | 14.9 s | Click into Maya Brooks's profile: verified badges, bio, rate guide, weekly availability grid. | LIVE | 07 Browse |
| `10-family-book-confirmed.mp4` | 20.0 s (sped 1.80×) | Family calendar → pick a Wednesday → 4–7 pm → choose Maya → type a note → tick "Make this recurring" → Confirm → toast **"Booked with Maya — you're all set!"**; the grid updates. | LIVE | 08 Booking |
| `11-family-last-minute.mp4` | 20.0 s (sped 1.16×) | Same-day booking tonight 6–10 pm, note "Sitter fell through — need someone tonight", same-day notice, Confirm → toast "Posted to our nannies to pick up…". | LIVE | 09 Emergency |
| `12-nanny-job-board-claim.mp4` | 10.4 s | Nanny (Maya) opens the Job Board — tonight's "Sitter fell through" request is on top — clicks **Accept this booking**; it leaves the board. | LIVE | 09 Emergency |
| `13-nanny-dashboard.mp4` | 16.8 s | Nanny home "Hi, Maya" (next booking, job-board count, confirmed) → Calendar: month grid labelled with family names + weekly-hours panel. (Brief loading spinner mid-clip when the route changes — cut around ~6–8 s.) | LIVE | 10 Nannies |
| `14-nanny-own-profile.mp4` | 12.7 s | Nanny's own profile: completeness meter, photo, bio, self-reported badges vs "Verified by Little Lamb", weekly availability. "Intro video" shows as not yet added. | LIVE | 10 Nannies |
| `15-family-review.mp4` | 20.0 s (sped 1.27×) | Family "Leave a review" → 5 stars → "Maya was wonderful. Theo is already asking when she can come back." → Submit → "Thank you — your feedback goes straight to the Little Lamb team, it's never public". | LIVE | 11 Reviews |
| `16-admin-bookings.mp4` | 20.0 s (sped 1.32×) | Admin Bookings: every booking across the platform with status chips, then "Create booking" override form (family, nanny, date, time), dismissed. | LIVE | 11 Admin |
| `17-admin-settings.mp4` | 12.0 s | Admin Settings: Badges catalog, then Policies tab — editable without a developer. | LIVE | 12 Roadmap (optional cutaway) |
| `18-mobile-landing.mp4` | 14.5 s | Phone-sized homepage scrolling — hero, trust strip, how it works. (+ `18-mobile-landing-vertical.mp4`) | LIVE | 04 Who is it for |
| `19-mobile-family.mp4` | 12.0 s | Phone-sized nanny directory → tap into Maya's profile → badges, about, rate guide, availability. (+ `19-mobile-family-vertical.mp4`) | LIVE | spare (07 alt) |

## Not filmed, on purpose

- **Billing pages / Analytics overview** — show platform fees and revenue; pricing is off-limits.
- **Intro video playback** — no nanny has uploaded one in the demo data; covered by narration.
- **Payments, emails, calendar invites** — built but not switched on until launch (PARTIAL).
- **Week view, drag-to-book, rebooking, mobile app** — PLANNED; roadmap card only.
