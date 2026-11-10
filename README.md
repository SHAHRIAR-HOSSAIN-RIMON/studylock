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
build.ps1           makes the store zips in dist/ (one for Edge/Chrome, one for Firefox)
store-assets/       store screenshots (1280×800) and promo tile
STORE_LISTING.md    ready-to-paste store descriptions and permission reasons
PRIVACY.md          privacy policy (host it on GitHub Pages for the store listings)
```

> When loading the unpacked `studylock` folder in Edge/Chrome you'll see a harmless warning about `background.scripts`. That line is for Firefox. The store zips made by `build.ps1` don't include it.

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
1. Run `powershell -ExecutionPolicy Bypass -File build.ps1`. It creates:
   - `dist/studylock-<version>-chromium.zip` for Edge and Chrome
   - `dist/studylock-<version>-firefox.zip` for Firefox
2. Turn on GitHub Pages (repo **Settings → Pages → Deploy from branch → main / root**) so `PRIVACY.md` gets a public link
3. **Microsoft Edge Add-ons** (free): register at Partner Center → Edge program, then upload the chromium zip
4. **Firefox Add-ons** (free): sign in at addons.mozilla.org/developers, then upload the firefox zip
5. **Chrome Web Store** (optional, $5 one-time): upload the chromium zip

All the text for the store forms (descriptions, permission reasons, data-usage answers) is in [STORE_LISTING.md](STORE_LISTING.md), and the images are in `store-assets/`.

To release an update: bump `version` in `studylock/manifest.json`, run `build.ps1` again, and upload the new zips.
