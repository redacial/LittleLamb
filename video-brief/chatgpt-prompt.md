# ChatGPT prompt package — Little Lamb Nannies launch video

> **How to use:** copy everything below the line into a new ChatGPT conversation. It is self-contained — ChatGPT has not seen our code. Attach nothing else unless it asks (if you want, attach a couple of frames from `video-brief/clips/` so it can match the look).

---

You are my creative producer for a **4–5 minute product launch video** for a college senior seminar (CS 195, Westmont College, Fall 2026). I'm David Melesse, co-founder of **Little Lamb Nannies**. I already have **real screen recordings of our app** for every demo moment. I need you to fill in everything *around* that footage and hand me an edit plan I can assemble myself in CapCut, iMovie, or Premiere.

## 1. The product

**Little Lamb Nannies** (littlelambnannies.com) connects Santa Barbara families with pre-screened nannies from their own community. It is a matching and scheduling platform — **not** a staffing agency. Families pay nannies directly; Little Lamb never touches wages.

- **The promise to families:** every nanny is background-checked and interviewed in person by the founders before their profile goes live. Families are interviewed too.
- **Who it's for (two-pronged):** families from **Santa Barbara churches** and **Westmont College faculty**; nannies who are **Westmont students** and **members of local churches**.
- **The problem:** today, finding a sitter in Santa Barbara means texting friends, posting in Facebook groups, and hiring whoever is free. National apps (Care.com, Sittercity) show you strangers from a nationwide marketplace and leave the vetting to you.
- **How we're different:** a trust-based, *local* network instead of referrals and group texts; the founders personally meet every family and every nanny; and our headline value beyond trust is **emergency / last-minute nannies** — a short-notice request goes to a job board the whole network sees, and the first available nanny claims it.
- **Values:** Christ-centered. Every nanny carries a spiritual reference from a pastor or church member. **10% of company revenue** goes to local nonprofits serving children in Santa Barbara.
- **Status:** the marketing site + waitlist is live now. We're **beta testing with select families and nannies**. **Public launch: January 2027.**
- **Do NOT mention pricing or fees anywhere** — our pricing model isn't final.

### What the app does today (real footage exists for all of this)
Family and nanny applications (one form creates the account); a 4-stage application tracker for nannies (Received → Under review → Interview → Decision); an admin panel where the founders approve people and assign "Verified by Little Lamb" badges (CPR, First Aid, Background Checked, Interviewed) vs. self-reported badges (Pet-Friendly, age ranges, Homework Help, Water-Safe…); a nanny directory and profiles (bio, badges, experience, weekly availability); instant booking when the nanny is free, with a "make this recurring" weekly option; same-day/last-minute requests posted to a **Job Board** where the first nanny to accept gets it; a nanny dashboard and calendar; private reviews only the founders see; admin override to create/cancel any booking; admin-editable badges and policies.

### Switching on at launch (built, not live yet)
Email confirmations, calendar invites, and payments.

### Planned after launch (NOT built — never show as working UI)
Week-view calendar, drag-to-book, one-tap rebooking of a favorite nanny, a mobile app with push notifications. Nanny intro videos are a required part of nanny setup, but no real ones are in our demo data yet.

### Team (only two people)
- **Lucy Behringer** — co-founder, operations. Firsthand childcare experience; drives the operational vision.
- **David Melesse** — co-founder, platform. Builds the technology; passion for tech that serves local communities.
- Both are Westmont seniors who met freshman year in The Bridge (formerly the Student Alumni Association).

### Proposed OKRs (first semester after launch)
1. Build a trusted network — 40 vetted nannies and 10 founding families (≈ 4 nannies per family).
2. Never leave a family stranded — most last-minute requests covered within 2 hours.
3. Earn trust — average private review rating above 4.8 stars.

## 2. Brand

- **Feel:** "Premium playful" — a warm Santa Barbara scrapbook. Boutique children's brand on the surface, serious vetting underneath. Hand-drawn illustration style: loose ink lines, flat dusty fills, cream backgrounds, generous negative space, slightly wobbly borders, big rounded corners. Gentle, bouncy motion. Trust-earned, never sterile.
- **Never:** purple gradients, glossy corporate SaaS, neon, stock-photo blandness, cartoonish clip-art, dark/moody grading.
- **Fonts:** **Caveat** (handwritten — headlines, titles), **DM Sans** (body/subtitles), **DM Mono** (small labels, numbers, badges). All free on Google Fonts.
- **Colors:**
  - Cream `#F5F0E8` (background) · Cream-dark `#EDE6D8` (cards)
  - Ink `#2C2416` (headlines) · Warm gray `#6B5E4E` (body)
  - Sage `#8FAF8A` (primary brand), sage-light `#C8DEC4`, sage-deep `#3D5C3A`
  - Periwinkle `#8B9DC3` (trust/verification), peri-light `#DDE3F0`, peri-ink `#2C3E6B`
  - Terracotta `#C4956A` (calls to action), terra-light `#F0DFD0`, terra-deep `#9B6A3F`
- **Logo:** a simple round sage badge with a small lamb face, next to the handwritten wordmark "Little Lamb" with "NANNIES" in small spaced caps beneath.
- **Location cues:** Santa Barbara — warm coastal light, Spanish-style white stucco and red tile roofs, jacarandas, the mountains behind town, a small-college campus lawn. Keep people diverse and natural; no recognizable real individuals, no real logos (don't depict Westmont's actual logo or buildings — "a small hillside college campus" is fine).

## 3. Voice and tone rules

Sounds like a founder talking, not an ad. Short sentences. Plain words. **Never use** "revolutionary", "seamless", "empower", "game-changing", "cutting-edge", "unlock", "elevate". Real app footage carries the demo; AI visuals only fill the gaps around it.

## 4. What I need from you — three deliverables

### Deliverable A — prompts for ONLY the non-app visuals
Write one ready-to-paste prompt per shot for an AI image/video generator (assume Sora / Runway / Midjourney-style; give a still-image prompt and a 5–8 s motion prompt for each). **16:9, at least 1920×1080**, matched to our palette and fonts. Cover exactly these slots from the script below:
- `AI-B1` cold-open kitchen, `AI-B2` group-text phone, `AI-B3` Santa Barbara community montage, `AI-B4` soft roadmap background, `AI-B5` values/closing warmth
- `TITLE-1` "Built for a community" title card
- `ROADMAP` card (three columns: **Now** — waitlist live, beta with families & nannies · **January 2027** — public launch; emails, calendar invites, payments switch on · **Next** — week-view calendar, drag-to-book, one-tap rebooking, mobile app)
- `OKR` card (the three OKRs above, numbers in DM Mono)
- `TEAM` card (layout for two real photos I'll drop in — Lucy and David — with names in Caveat and roles in DM Mono; do NOT generate faces for us)
- `INTRO` logo sting (2–3 s) and `OUTRO` end card ("littlelambnannies.com · Opening January 2027 · Santa Barbara")
For cards, also give me exact layout specs (text, font, size, color hex, position) so I can build them in Canva/CapCut if the generator garbles text — generators often misspell words, so tell me which elements to add as real text layers.
Never generate fake app screens or phone UIs that look like our product.

### Deliverable B — final voiceover read
Polish the narration below into a final read **without changing any facts** and keeping each beat close to its time slot. Add pacing notes: pauses (in seconds), emphasis, tone per beat (warm, matter-of-fact, quiet pride), and where to smile. Format it so I can read it myself or paste each beat into a TTS tool. Keep it ≈ 540–580 words.

### Deliverable C — edit decision list (EDL)
A table of every shot in order: shot #, start–end timecode, source (real clip filename + in/out seconds within that clip, or AI shot ID), narration line over it, on-screen text/lower-thirds, transition into the next shot (cut / 6-frame cross-dissolve / match cut / whip — keep it calm), and music cue. Then: a **music brief** (mood, tempo, instrumentation — e.g. warm acoustic guitar + soft piano + light claps, ~90–100 BPM, gentle build into the emergency beat and a lift at the team/outro; suggest 3 royalty-free search terms), a color/finishing note (subtle warm grade on real clips, cream letterbox-free), caption style (DM Sans, ink on cream pill), and a final checklist for exporting **1920×1080, 30 fps, H.264**.

Constraints for the EDL: total **4:30–4:45**; real clips carry every demo moment; any clip can be trimmed, held on its last frame, or sped ≤ 1.2× more; mobile clips are already composited on a cream 16:9 canvas.

---

## 5. The script (timed, with visuals and rubric mapping)

### Timed script

| # | Time | Narration (word-for-word) | Visual | Rubric |
|---|---|---|---|---|
| 01 | 0:00–0:12 | It's five o'clock. Your sitter just cancelled. You have a dinner at seven, and two kids who need someone you can actually trust. | **AI-B1** — warm kitchen at dusk, parent reads a phone, a child tugs their sleeve. On-screen phone text: "So sorry, can't make it tonight." | Problem (hook) |
| 02 | 0:12–0:30 | This is Little Lamb Nannies. We connect Santa Barbara families with nannies who are vetted before you ever meet them. Every nanny is background-checked, and interviewed in person by us, the founders. | `01-landing-hero.mp4` (0:00–15.8) → hold last frame | **What is it?** |
| 03 | 0:30–0:52 | Here's how finding a sitter works today. You text three friends. You post in a Facebook group. You hire whoever is free, and you hope. The big national apps don't really fix it. They show you strangers from a giant marketplace, and you're still the one doing the vetting. | **AI-B2** — over-the-shoulder phone, a long group-text thread scrolling ("anyone know a sitter??") → `02-meet-the-network.mp4` | **What problem does it solve?** |
| 04 | 0:52–1:10 | So we built Little Lamb for two groups. Families from Santa Barbara churches and Westmont faculty. And nannies from those same places: Westmont students and people from our local churches. It's a community, not a marketplace. | **TITLE-1** "Built for a community" (Caveat) over **AI-B3** (sunny Santa Barbara street / church courtyard / Westmont-style campus lawn) → `18-mobile-landing.mp4` | **Who is it for?** |
| 05 | 1:10–1:32 | It starts with a short application. Families tell us about their kids. Nannies apply too, and they can see exactly where they are. Received. Under review. Interview. Decision. Nobody goes live until we've met them. | `03-family-apply.mp4` (to "Thanks, Rebecca") → `04-nanny-application-status.mp4` | Who is it for / Why try |
| 06 | 1:32–1:52 | On our side, Lucy and I review every person by hand. We meet every family and every nanny. When we confirm a certification, like CPR or first aid, it shows up as verified by Little Lamb. Not just self-reported. | `05-admin-dashboard.mp4` → `06-admin-vetting.mp4` (badges ticked, Approve) | **Why try it?** (trust) |
| 07 | 1:52–2:12 | Once you're approved, you browse nannies who already live in your community. Their experience, their badges, the ages they love, and when they're free. Every nanny also records a one-minute intro, so you hear their voice before they walk through your door. | `08-family-browse-nannies.mp4` → `09-nanny-profile.mp4` | Why try it |
| 08 | 2:12–2:30 | Booking takes about thirty seconds. Pick a day, a time, and a nanny. If she's free then, it's confirmed on the spot. Want the same time every week? Check one box. | `10-family-book-confirmed.mp4` (ends on "Booked with Maya — you're all set!") | Use case: weekly care |
| 09 | 2:30–2:56 | And this is the part we care about most. Remember that five o'clock cancellation? Post it, and it goes straight to our job board. Every nanny in the network can see it. The first one who's free claims it, and you're covered. That's emergency care you can't get from a group text. | `11-family-last-minute.mp4` → `12-nanny-job-board-claim.mp4` | **Why try it?** + differentiation; use case: emergency |
| 10 | 2:56–3:10 | For nannies, it means a steady schedule without chasing clients. Bookings, calendar, and profile, all in one place. And they never pay us a thing. | `13-nanny-dashboard.mp4` → `14-nanny-own-profile.mp4` | Who is it for (nannies) |
| 11 | 3:10–3:24 | After every visit, both sides leave a private review that only we see. And when something needs a human, we can step in and fix it ourselves. | `15-family-review.mp4` → `16-admin-bookings.mp4` | Why try it (accountability) |
| 12 | 3:24–3:46 | Right now our waitlist is live, and we're beta testing with a few families and nannies. We open to the public in January. Email confirmations, calendar invites, and payments switch on at launch. After that comes a week-view calendar, drag-to-book, one-tap rebooking, and a mobile app. | **ROADMAP card** (Now · January · Next) over soft **AI-B4** b-roll; optional 2-s cut to `17-admin-settings.mp4` | Roadmap (PARTIAL + PLANNED, narration only) |
| 13 | 3:46–4:02 | Our goals for the first semester are simple. Forty vetted nannies and ten founding families. Most last-minute requests covered within two hours. And reviews that stay above four point eight stars. | **OKR card** (3 rows, DM Mono numbers) | OKRs |
| 14 | 4:02–4:16 | We're Lucy Behringer and David Melesse, two Westmont seniors who met freshman year. Lucy brings firsthand childcare experience and runs operations. I build the platform. | **TEAM card** — real photos of Lucy and David (supplied by David), names in Caveat, roles in DM Mono | **Who built it?** |
| 15 | 4:16–4:30 | Little Lamb is Christ-centered. Every nanny carries a reference from a pastor or church leader. And ten percent of what we earn goes to local nonprofits serving kids. | **AI-B5** — hands of a nanny and a child planting seeds / drawing with chalk, golden hour | Why try it (values) |
| 16 | 4:30–4:40 | Little Lamb opens in January. Join the waitlist at little lamb nannies dot com. We'd love to meet you. | **OUTRO** — logo lockup on cream, "littlelambnannies.com · Opening January 2027 · Santa Barbara" | Call to action |

**Total narration:** 540 words ≈ 3:52 of speech at 140 wpm inside a 4:40 cut — the gaps are deliberate breathing room for title cards and on-screen moments (toasts, "Booked with Maya").

### Rubric coverage

| Rubric item (15 pts each) | Beat(s) |
|---|---|
| What is it? | 02 |
| Who is it for? | 04 (primary), 05, 10 |
| What problem does it solve? | 01, 03 |
| Why try it? | 06, 07, 09 (primary), 11, 15 |
| Who built it? | 14 |
| Also: differentiation · OKRs · use cases · roadmap | 03 + 09 · 13 · 08 + 09 · 12 |

### Claims check (nothing unbuilt shown as working)

- **LIVE:** application + 4-stage status, admin vetting + verified badges, directory, profile, instant booking, recurring weekly, same-day → job board → first-claim, nanny dashboard/calendar, private reviews, admin override.
- **PARTIAL, narrated as "at launch":** email confirmations, calendar invites, payments (beat 12).
- **PLANNED, roadmap card only:** week view, drag-to-book, one-tap rebooking, mobile app (beat 12).
- **Intro video (beat 7):** the upload step is built into the nanny setup wizard, but the demo data has no videos, so **no video is shown**; the line describes the requirement, not a clip.
- **Process, not software:** in-person interviews, background checks, pastor references happen offline (beats 2, 6, 15).
- **OKRs (beat 13) are a proposal for David and Lucy to confirm**, derived from the analytics targets (1 family : 4 nannies) and the emergency-coverage promise.

---

## 6. Real app clips available (all 1920×1080, 30 fps, no audio)

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

### Not filmed, on purpose

- **Billing pages / Analytics overview** — show platform fees and revenue; pricing is off-limits.
- **Intro video playback** — no nanny has uploaded one in the demo data; covered by narration.
- **Payments, emails, calendar invites** — built but not switched on until launch (PARTIAL).
- **Week view, drag-to-book, rebooking, mobile app** — PLANNED; roadmap card only.

---

Please deliver A, B, and C in that order, each under its own heading. Ask me nothing first — make sensible choices and note any assumption inline.
