# Little Lamb Nannies

A website that connects Santa Barbara families with trusted, pre-screened nannies.
Families browse and book nannies, nannies manage their schedule and profile, and the admin
team (Lucy & David) approves accounts and oversees everything.

Built with React, TypeScript, Vite, and Firebase.

---

## 👋 For Lucy (or anyone non-technical) — how to see the app on your computer

You'll open a "Terminal" and type a few short commands. It looks intimidating but it's just
four lines, one time. Follow along exactly.

### Step 1 — Install Node.js (one time only)

Node.js is the engine that runs the app. 

1. Go to **https://nodejs.org**
2. Click the big green button that says **"LTS"** (it'll show a version number like 20 or 22).
3. Open the file you downloaded and click through the installer (Next → Next → Install).

You only ever do this once.

### Step 2 — Open the project in Terminal

1. Open the **Terminal** app:
   - On a Mac: press `Cmd` + `Spacebar`, type **Terminal**, press Enter.
2. Type `cd ` (the letters c, d, then a space — don't press Enter yet).
3. Drag the **LittleLamb** project folder from Finder right onto the Terminal window. It will
   paste the folder's location for you.
4. Now press **Enter**.

You're now "inside" the project.

### Step 3 — Install the app's building blocks (one time only)

Type this and press Enter:

```
npm install
```

It will think for a minute or two and print a lot of text. That's normal. Wait until it
finishes and you get your cursor back.

### Step 4 — Start the app

Type this and press Enter:

```
npm run dev
```

After a moment you'll see a line like:

```
➜  Local:   http://localhost:5173/
```

**Hold `Cmd` and click that `http://localhost:5173/` link** (or copy it into your web browser).
The app opens. 🎉

### When you're done

Click back on the Terminal window and press `Ctrl` + `C` to stop the app. To start it again
later, just do **Step 2** and **Step 4** again (you never have to repeat Steps 1 and 3).

---

## ⚠️ One important note

To actually **log in, create accounts, or save data**, the app needs to be connected to our
Firebase account (that's the secure database behind the scenes). Until David adds those
connection keys, the app will open and you can see the design and layout, but signing in and
saving won't work yet.

David: copy `.env.example` to a new file named `.env` and fill in the values from the Firebase
console. See **"For developers"** below.

---

## What you can explore once it's connected

- **Families** — browse nannies, book on the calendar, manage their profile, see billing
- **Nannies** — set availability, build a profile with photo/video/badges, accept bookings
- **Admin (Lucy & David)** — approve applications, see every booking, manage billing, message
  families and nannies, view analytics

---

## 🛠 For developers

### Requirements
- Node.js 18+ (20 LTS recommended)

### Setup
```bash
npm install                 # install dependencies
cp .env.example .env        # then fill in real Firebase values
npm run dev                 # start the dev server at http://localhost:5173
```

### Connecting Firebase
1. In the [Firebase console](https://console.firebase.google.com), open the project's web app
   config and copy the values into `.env` (the variable names are listed in `.env.example`).
2. Enable **Email/Password** and **Google** sign-in providers (Authentication → Sign-in method).
3. Deploy the security rules and indexes:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
4. (Production) Set a reCAPTCHA v3 site key in `VITE_FIREBASE_APPCHECK_SITE_KEY` to enable
   Firebase App Check.

### Useful commands
| Command | What it does |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Build the production bundle into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the test suite |
| `npm run typecheck` | Check TypeScript types |

### Project layout
- `src/components` — UI components (presentation only)
- `src/hooks` — all Firebase reads/writes
- `src/pages` — route-level screens (family / nanny / admin / shared)
- `src/lib` — Firebase setup, sanitization, formatting, access helpers
- `src/types` — shared TypeScript interfaces
- `firestore.rules` / `storage.rules` — security rules (the real access boundary)
- `docs/` — security checklist + audit
- `DECISIONS.md` — why things were built the way they were
- `Backlog.md` — what's done and what's left

The current build status and remaining work live in **`Backlog.md`**.
