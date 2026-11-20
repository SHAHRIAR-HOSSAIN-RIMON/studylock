# StudyLock: Pomodoro Timer & Site Blocker 🔒⏱️

**A free Pomodoro study timer that blocks distracting sites (YouTube, Instagram, Facebook…) only while you focus.**
No account. No tracking. Everything stays on your device.

🦊 **[Get it on Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/studylock/)**  
💻 **Chrome / Edge:** [install from source](#install-on-chrome--edge) (takes 30 seconds, store versions coming)
<img width="1280" height="800" alt="image" src="https://github.com/user-attachments/assets/8dfeaf59-817f-4351-8bf1-2392882f2008" />



## Why I built this
I'm a university student, and I kept opening YouTube "for 2 minutes" during study sessions. It was never 2 minutes.
I wanted a simple timer that actually locks the distractions while I study, without signing up for anything. So I built one.

## Features
- ⏱️ **Pomodoro timer**: focus / short break / long break (25 / 5 / 15 by default, all adjustable)
- 🔒 **Blocks your chosen sites only during focus sessions**, including tabs that are already open
- ⏳ **"Stay focused" page** with a live countdown instead of the blocked site
- 🔢 **Toolbar badge** shows the minutes left
- 🔔 **Notifications** when a session or break ends, with optional auto-start
- 💪 **Strict mode**: no pause, skip or reset during focus
- ⚡ **Quick-add presets**: social media, video & streaming, news, games
- 📊 **Stats**: last 7 days chart, weekly totals, day streak
- 💾 **Export / import backup** to move your settings and stats to another browser
- 🌗 **Light and dark theme**

## Screenshots

**Distracting sites show a countdown instead**
<img src="https://github.com/user-attachments/assets/f24f4023-0f2a-4549-8248-610d64af5d28" alt="Blocked site page" width="700">

**Block any site you want**
<img src="https://github.com/user-attachments/assets/bbd4a54d-5428-47b7-b6e4-e7a53c1d2d3d" alt="Settings page" width="700">

**Track your study time and streak**
<img src="https://github.com/user-attachments/assets/c5a0b4cf-da5e-4b2c-ac24-f2354231f17a" alt="Stats page" width="700">
## Privacy
StudyLock has **no account, no analytics and no server**. Your settings, block list and stats are stored only in your browser.
Full policy: [PRIVACY.md](PRIVACY.md)

## Install

### Firefox
Install it from **[Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/studylock/)**.

### Install on Chrome / Edge
StudyLock isn't on the Chrome or Edge stores yet, but you can install it directly:
1. [Download the ZIP](https://github.com/SHAHRIAR-HOSSAIN-RIMON/studylock/archive/refs/heads/main.zip) and unzip it
2. Open `chrome://extensions` (or `edge://extensions`)
3. Turn on **Developer mode** (top right in Chrome, left side in Edge)
4. Click **Load unpacked** and select the `studylock` folder inside what you unzipped
5. Pin StudyLock to your toolbar and start a focus session 🎉

> You may see a harmless warning about `background.scripts`. That line is only for Firefox and can be ignored.

---

## For developers

### How it works
- **Manifest V3** extension, plain JavaScript, **no build step**
- `background.js` runs the timer as a state machine using browser **alarms**, so it keeps working when the popup is closed
- During focus sessions it turns on blocking rules for your list (subdomains included) and redirects matching tabs to `blocked.html`
- One codebase runs on **Chrome, Edge and Firefox**; `build.ps1` produces a separate zip for each store

### Project layout
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
STORE_LISTING.md    store descriptions and permission reasons
PRIVACY.md          privacy policy
```

### Run it locally
**Chrome / Edge:** see [Install on Chrome / Edge](#install-on-chrome--edge) above.

**Firefox**
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…** and select `studylock/manifest.json`
3. If the popup shows "Allow site access", click it (Firefox asks for site access separately)

Tip for testing: set Focus to 1 minute in Settings.

### Run the tests
```bash
node --test tests/*.test.js
```

### Build and release
1. Bump `version` in `studylock/manifest.json`
2. Run `powershell -ExecutionPolicy Bypass -File build.ps1`. It creates:
   - `dist/studylock-<version>-chromium.zip` for Edge and Chrome
   - `dist/studylock-<version>-firefox.zip` for Firefox
3. Upload the zips to the stores. Store text is in [STORE_LISTING.md](STORE_LISTING.md) and images are in `store-assets/`

## Roadmap
- ✅ Firefox Add-ons
- ⬜ Microsoft Edge Add-ons
- ⬜ Chrome Web Store
- ⬜ Scheduled blocking (e.g. block every weekday 9–5)


## Feedback
Found a bug or have an idea? [Open an issue](https://github.com/SHAHRIAR-HOSSAIN-RIMON/studylock/issues). Feedback from fellow students is very welcome!

## License
MIT. See [LICENSE](LICENSE).<img width="1280" height="800" alt="promp1" src="https://github.com/user-attachments/assets/0e663e90-b9ed-45bc-9f93-ccc8e5e1becf" />

