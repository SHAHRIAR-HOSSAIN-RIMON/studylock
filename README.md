# StudyLock: Pomodoro Timer & Site Blocker

A free, no-account browser extension for students: a Pomodoro study timer that blocks distracting sites (YouTube, Facebook, Instagram…) while you focus. Everything stays on your device.

## Features
- Focus / short break / long break timer (25 / 5 / 15 by default, all adjustable)
- Blocks your chosen sites **only during focus sessions**, and redirects already-open tabs too
- "Stay focused" page with a live countdown instead of the blocked site
- Badge on the toolbar icon shows the minutes left
- Notifications when a session or break ends; optional auto-start
- **Strict mode**: no pause, skip or reset during focus
- Quick-add presets (social, video, news, games)
- Stats: last 7 days chart, weekly totals, day streak
- Export / import backup
- Light and dark theme
- Works in Chrome, Edge and Firefox from one codebase. No build step needed

## Project layout
```
studylock/          ← the extension itself (load or zip this folder)
  manifest.json
  shared.js         helpers shared by all parts
  background.js     timer state machine, blocking rules, alarms, notifications
  popup.html/js     toolbar popup with the timer
  options.html/js   settings, block list, stats, backup
  blocked.html/js   page shown instead of a blocked site
  style.css
  icons/
tests/              Node tests with a fake browser API
build.ps1           makes dist/studylock-<version>.zip for the stores
PRIVACY.md          privacy policy (host it on GitHub Pages for the store listings)
```

## Try it locally
**Chrome / Edge**
1. Open `chrome://extensions` (or `edge://extensions`)
2. Turn on **Developer mode**
3. Click **Load unpacked** and select the `studylock` folder

**Firefox**
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…** and select `studylock/manifest.json`
3. If the popup shows "Allow site access", click it (Firefox asks for site access separately)

Tip for testing: set Focus to 1 minute in Settings.

## Run the tests
```bash
node --test tests/*.test.js
```

## Publish (free)
1. Run `powershell -File build.ps1` to create `dist/studylock-1.0.0.zip`
2. Host `PRIVACY.md` publicly (e.g. GitHub Pages) and use its link in the store forms
3. **Microsoft Edge Add-ons** (free): register at Partner Center → Edge program, then upload the zip
4. **Firefox Add-ons** (free): sign in at addons.mozilla.org/developers, then upload the same zip.
   Before the first upload, change `browser_specific_settings.gecko.id` in `manifest.json` to your own ID (e.g. `studylock@yourname`)
5. **Chrome Web Store** (optional, $5 one-time): upload the same zip

For each store you need: a short and long description, at least one 1280×800 screenshot, the 128px icon, the privacy policy link, and a one-line reason for each permission (see PRIVACY.md).
