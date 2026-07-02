# ContestTracker

A competitive programming contest tracker that pulls upcoming contests from Codeforces, LeetCode, CodeChef, and GeeksforGeeks, and displays them in a clean, card-based UI — with reminders, browser notifications, a monthly calendar view, and one-click **"Add to Calendar" (Google Calendar)** buttons on every contest card.

## Features

- Upcoming contests from Codeforces (live API), LeetCode, CodeChef, and GeeksforGeeks (generated fixed schedule).
- Card UI with countdowns, register links, in-app reminders, and browser push notifications.
- Monthly calendar view of all contests.
- **📅 Add to Calendar** — opens Google Calendar in a new tab, pre-filled with the contest name, platform, correct start/end time (time-zone safe), and the contest link in the description.
- Light/dark theme toggle, responsive layout, offline fallback via `localStorage` cache.
- Companion Hackathons page (`hackathons.html`).

## Project structure

```
ContestTracker/
├── index.html              Main contest tracker page
├── hackathons.html          Hackathons & events page
├── js/
│   ├── main.js               App entry point / orchestration
│   ├── api.js                 Codeforces API fetch (live data)
│   ├── contestData.js         Generates LeetCode/CodeChef/GFG fixed-schedule contests
│   ├── ui.js                  Renders contest cards, countdowns, button handlers
│   ├── calendar.js            Monthly calendar grid view
│   ├── googleCalendar.js      Builds "Add to Calendar" Google Calendar links
│   ├── reminderStorage.js     Persists in-app reminders (localStorage)
│   ├── notificationPermission.js  Browser notification permission UI/logic
│   ├── notificationDispatcher.js  Polls contests and fires due reminders
│   ├── hackathons.js / hackathons-page.js  Hackathons page logic
├── styles/
│   ├── style.css              Base styles, theme variables, buttons
│   ├── contests.css           Contest card layout & responsiveness
│   ├── calendar.css           Calendar view styles
│   └── hackathons.css         Hackathons page styles
└── README.md
```

No build step, no bundler, no `node_modules` — it's plain HTML/CSS/JS using native ES modules (`<script type="module">`).

## Running locally

Because the app uses ES modules (`import`/`export`), opening `index.html` directly via `file://` will fail in most browsers (CORS restrictions on module scripts). You need to serve the folder over a local HTTP server. Pick whichever is easiest for you:

### Option 1 — Python (built into most systems)
```bash
cd ContestTracker
python3 -m http.server 8000
```
Then open **http://localhost:8000** in your browser.

### Option 2 — Node.js (`npx`, no install needed)
```bash
cd ContestTracker
npx serve .
```
or
```bash
cd ContestTracker
npx http-server -p 8000
```
Then open the URL it prints (typically **http://localhost:8000**).

### Option 3 — VS Code "Live Server" extension
Open the `ContestTracker` folder in VS Code, install the **Live Server** extension, right-click `index.html` → **"Open with Live Server"**.

## Notes

- The Codeforces contest list is fetched live from `https://codeforces.com/api/contest.list` — you'll need an internet connection for that section to populate; LeetCode/CodeChef/GFG schedules are generated locally and always work offline.
- Browser notifications require you to grant permission when prompted (first visit). If denied, you'll see a banner explaining how to re-enable it in your browser settings.
- **Add to Calendar**: Google Calendar's quick-add link doesn't support forcing a custom reminder time via URL, so the created event uses your Google account's default reminder (commonly 30 minutes before) — the event description notes this and tells you where to adjust it if needed.
