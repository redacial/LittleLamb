# Meeting with Lucy — 2026-08-12

**Goal of this meeting:** unblock the two things only Lucy can unblock — **DNS control** and
**her content**. Everything else (Stripe, Resend key, App Check) is already done.

---

## 🔴 Priority 1 — DNS / the Wix account (the one that can slip launch)

**Why it matters:** Right now `littlelambnannies.com` points at Wix (`216.198.79.1`), not at
our Firebase site. Two launch steps are stuck behind this and *only* this:
- Pointing the live domain at the real app (Firebase Hosting).
- Verifying `hello@littlelambnannies.com` so the platform can send real email (Resend).

Both need someone to add DNS records in whatever account controls the domain. That's the ask.

**Don't ask "is DNS good?"** (too vague). Ask these, concretely:

1. **Who has the login to the Wix account** for `littlelambnannies.com` — you, me, or someone
   else (a former partner / whoever first bought the domain)?
2. **Can we get into it today/this week?** If it's someone else's login, how fast can they
   respond? (This is the real risk — an unreachable account owner is what delays launch.)
3. Where was the domain actually **purchased** — Wix directly, or GoDaddy/Namecheap/Google
   Domains with Wix just hosting? (Changes where the records get edited.)

**What I need out of this meeting:** either the Wix login, or a named person + a realistic
timeline for them to add DNS records I'll send. Nothing needs editing *at* the meeting — just
get the door open.

---

## 🟡 Priority 2 — Content only Lucy can provide

None of this blocks *building/deploying*, but all of it blocks **launching to real families**.
Collect whatever's ready; flag what's still pending.

1. **Badge list (final).** The exact badges nannies can display, split into two groups:
   - **Self-reported** (nanny picks these) — e.g. Pet-Friendly, Ages 0–2, Ages 3–7, Ages 8–12.
   - **Admin-verified** (Lucy/David assign after interview) — e.g. CPR Certified, First Aid.
   - Ask: is this the final list, or are there additions/removals? Any wording preferences?

2. **Policies page content.** Two sections:
   - **Little Lamb Policies** (platform-wide: conduct, community expectations).
   - **Family Policies / Nanny Policies** (role-specific).
   - Even rough bullet points are fine to start — we can format.

3. **Nanny bios / photos / intro videos** for the 2–3 real nannies teased on the landing page
   and directory. Ask what real content exists vs. what's still placeholder.

4. **Brand colors for the two badge types** (verified vs self-reported need distinct colors).
   Confirm the sage/terracotta palette covers this or if she wants a specific pairing.

---

## 🟢 Priority 3 — Business decisions still open (confirm if time allows)

These are documented as open items; getting answers now avoids rework later. Not urgent for
this meeting if time is short — DNS + content come first.

- **Same-day booking** admin card design + action flow.
- **Unmatched booking** in-app nanny assignment mechanism.
- **Nanny cancellation** workflow — direct-cancel vs admin-mediated; the 48-hour self-cancel
  threshold (yes/no?).
- **Separate admin logins vs one shared account** (affects "Replied by Lucy/David" tagging in
  Messages).
- **How far ahead** families can book, and how far ahead a nanny can remove availability.

---

## What Lucy does NOT need to worry about (so she knows it's handled)
- Stripe billing setup — done (test mode).
- Email sending infrastructure — key is in; just needs the domain verified (Priority 1).
- Bot/spam protection on the waitlist (App Check) — done.
- All engineering — done and tested; nothing is blocked on code.

---

## The one sentence to leave with
> "I need either the Wix login or a named person who can add DNS records this week — that's the
> only thing standing between us and pointing the site live + turning on email."
