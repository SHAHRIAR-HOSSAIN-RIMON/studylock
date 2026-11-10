# Store listing text (copy-paste into the store forms)

Upload files:
- **Edge Add-ons / Chrome Web Store:** `dist/studylock-<version>-chromium.zip`
- **Firefox Add-ons:** `dist/studylock-<version>-firefox.zip`

Images are in `store-assets/`:
- `1-timer.png`, `2-blocked.png`, `3-settings.png`, `4-stats.png`: screenshots (1280×800)
- `promo-small-440x280.png`: small promo tile (Edge / Chrome)
- Store icon: `studylock/icons/icon128.png` (Edge wants 300×300; it accepts 128×128 upscaled, or ask Claude for a 300px version)

Privacy policy URL: `https://shahriar-hossain-rimon.github.io/studylock/PRIVACY` (works after you turn on GitHub Pages)

---

## Name
StudyLock: Pomodoro Timer & Site Blocker

## Category
Productivity

## Short description / summary (132 characters max)
Pomodoro study timer that blocks YouTube, Facebook and other distracting sites while you focus. Free, no account, no tracking.

## Full description
Stay focused while you study.

StudyLock is a simple Pomodoro timer that blocks distracting websites only while you're focusing. Press Start, study for 25 minutes, and sites like YouTube, Facebook, Instagram and TikTok show a "stay focused" countdown instead. When your break starts, everything opens again.

FEATURES
• Pomodoro timer: focus, short break and long break (25 / 5 / 15 minutes by default, all adjustable)
• Blocks distracting sites only during focus sessions, including tabs that are already open
• Add any site you want, or use quick presets: social media, video & streaming, news, games
• Strict mode: no pause, skip or reset during a focus session
• Minutes left shown on the toolbar icon
• Notifications when a session or break ends, with optional auto-start
• Study stats: last 7 days chart, weekly totals and day streak
• Export / import a backup of your settings and stats
• Light and dark theme

PRIVATE BY DESIGN
• No account, no sign-up
• No tracking, no analytics, no ads
• All your data stays in your browser. Nothing is ever sent anywhere
• Free and open source

Made for students preparing for exams, assignments and viva, and for anyone who wants fewer distractions.

## Single purpose (Chrome Web Store asks for this)
StudyLock is a study timer that blocks the user's chosen distracting websites during timed focus sessions.

## Permission justifications
| Permission | Justification |
|---|---|
| Host permissions (`<all_urls>`) | Users choose which websites to block, so the extension must be able to redirect any site on their block list to its "stay focused" page during a focus session, and to redirect already-open tabs of those sites when a session starts. No page content is read or collected. |
| declarativeNetRequest | Used to block (redirect) the user's chosen sites during focus sessions, using the browser's built-in, privacy-preserving blocking API. |
| storage | Saves the user's settings, block list and study statistics locally on their device. |
| alarms | Ends focus sessions and breaks on time, even when the popup is closed. |
| notifications | Tells the user when a focus session or break has finished. |

## Data usage answers
- Does the extension collect or use user data? **No.**
- Remote code? **No.** All code is included in the package.
- Firefox "data collection permissions": **none** (already declared in the Firefox manifest).

## Test notes for reviewers
1. Click the toolbar icon and press "Start focus".
2. Open youtube.com: it redirects to the extension's "This site is blocked while you focus" page.
3. Open the settings (⚙ in the popup) to change timer lengths (set Focus = 1 minute for a quick test) and the block list.
No account or login is needed.
