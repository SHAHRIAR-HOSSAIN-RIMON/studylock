# Job/Internship Tracker: Chrome Extension Plan

*Researched 10 Nov 2026. Pricing and limits come partly from third-party reviews; check them on vendor sites before relying on them.*

## 1. Why build it (the gap)

| Tool | Free plan | Paid | Weak point for students |
|---|---|---|---|
| Huntr | Up to 100 tracked jobs | Pro around $40/month | Cap hits fast for final-years applying widely |
| Teal | Tracking free | Teal+ around $29 per 30 days | Account required, data on their server, upsell-heavy |
| Simplify | Free core + autofill | Simplify+ around $40/month | Focused on US job boards and autofill |

**Our angle:** free, **no account**, **data stays on your machine**, built for students (internships, deadlines, CV versions, follow-up reminders). Works on any site that publishes standard job data.

## 2. Decisions

| Question | Decision | Why |
|---|---|---|
| Database | **Local-first: `chrome.storage.local`** (v1). Supabase only as optional cloud sync in v3 | See section 3 |
| Framework | **WXT + React + TypeScript + Tailwind** | WXT is the current go-to: Vite-based, generates the MV3 manifest, hot reload, builds for Chrome, Edge and Firefox from one codebase |
| Drag and drop | `dnd-kit` | React-native and accessible |
| Job data extraction | **JSON-LD `JobPosting` first**, site-specific selectors second, manual edit always | JSON-LD is the stable standard job sites publish for Google Jobs; CSS class names (especially LinkedIn's) change often |
| AI features | Not in v1; optional in v3 | Keeps it free, offline and simple to get approved |
| Deployment | Chrome Web Store (+ Edge Add-ons for free) | $5 one-time developer fee |

## 3. Database: local vs Supabase

| | Local (`chrome.storage.local`) | Supabase (free tier) |
|---|---|---|
| Cost | Free forever | Free, but **project pauses after 7 days of inactivity** (data kept, but needs a manual restore) |
| Login | None | Required: OAuth in MV3 extensions is fiddly (`chrome.identity.launchWebAuthFlow`, redirect URLs, and the session not being shared between popup and service worker is a known auth-js issue) |
| Privacy / store review | No data leaves the device, so the privacy policy is simple | Collecting personal data means stricter disclosure |
| Offline | Works | Needs internet |
| Multi-device | No (export/import JSON instead) | Yes |
| Capacity | 10 MB by default, **unlimited with the `unlimitedStorage` permission**: thousands of jobs | 500 MB |

**Why `chrome.storage.local` and not IndexedDB (Dexie)?** The content script that shows the "You already applied here" banner runs *on linkedin.com*. There, IndexedDB belongs to LinkedIn's origin, not the extension's. `chrome.storage.local` is readable from the content script, popup, dashboard and service worker alike, so one store serves every part.

**When to add Supabase (v3):** only if users ask for phone or multi-device access. It would be an opt-in "Sign in to sync" button, with local storage staying the source of truth.

## 4. Features by version

### v1 (MVP)
1. **Popup "Save job":** auto-fills title, company, location, URL and description, all editable, with status and deadline fields
2. **Description snapshot:** the full text is saved so it survives if the posting is deleted
3. **Dashboard (full tab):** Kanban (Saved → Applied → Interview → Offer / Rejected / Ghosted) plus a table with search and filter
4. **"Already saved/applied" banner:** shown on revisiting a job URL
5. **Right-click → "Save selection as job":** fallback for any site
6. **Export/Import** as JSON (full backup) and CSV (for Excel)

### v2 (the reasons to choose this over competitors)
7. Deadline and follow-up reminders (`chrome.alarms` + `chrome.notifications`)
8. CV/cover-letter version tag per job
9. Interview card: date, interviewer, questions asked, notes
10. Stats: applications per week, response rate per source

### v3 (optional)
11. Supabase opt-in sync
12. AI skill match (job requirements vs the user's skills)

## 5. Architecture

```
Job page (linkedin.com/jobs/…, any site)
 └─ Content script ── extract JSON-LD / selectors ──┐
    └─ "Already applied" banner (reads storage)      │ message
                                                     ▼
Popup (React) ── edit + Save ──► chrome.storage.local ◄── Dashboard tab (React)
                                        ▲                    Kanban / table / stats
Background service worker ──────────────┘
  context menu, alarms → reminder notifications
```

### Data model
```ts
type Status = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected' | 'ghosted';

interface Job {
  id: string;            // crypto.randomUUID()
  url: string;           // normalised (no tracking params): used for duplicate detection
  title: string;
  company: string;
  location?: string;
  source: string;        // 'linkedin' | 'indeed' | hostname
  description?: string;  // snapshot
  salary?: string;
  status: Status;
  deadline?: string;     // ISO date
  appliedAt?: string;
  cvVersion?: string;
  notes?: string;
  history: { status: Status; at: string }[];
  createdAt: string;
  updatedAt: string;
}
```
Stored as `jobs: Record<id, Job>` plus a `schemaVersion` number, so future migrations are safe.

### Permissions (keep minimal for a fast review)
- `storage`, `unlimitedStorage`, `contextMenus`, `activeTab`, `alarms` (v2), `notifications` (v2)
- Host permissions only for supported job sites (e.g. `*://*.linkedin.com/jobs/*`). Other sites go through `activeTab` when the user clicks, so there's no broad "read all sites" warning.

## 6. Project structure (WXT)
```
job-tracker/
├─ wxt.config.ts
├─ entrypoints/
│  ├─ popup/          # Save form
│  ├─ dashboard/      # Full-page app (Kanban, table, stats)
│  ├─ content.ts      # Extraction + banner
│  └─ background.ts   # Context menu, alarms
├─ lib/
│  ├─ storage.ts      # CRUD over chrome.storage.local
│  ├─ extractors/
│  │  ├─ jsonld.ts    # Generic JobPosting parser
│  │  ├─ linkedin.ts
│  │  └─ index.ts     # Picks the extractor by hostname
│  └─ csv.ts
└─ tests/             # Vitest: extractors against saved HTML fixtures
```

## 7. Build milestones

| # | Milestone | Done when | Est. |
|---|---|---|---|
| 1 | WXT scaffold, storage layer, popup with manual form | Can save a job and see it persist | 1 day |
| 2 | Dashboard table: edit, delete, status change | Full CRUD works | 1–2 days |
| 3 | JSON-LD extractor + tests | Auto-fills on sites with JobPosting data | 1 day |
| 4 | LinkedIn extractor | Auto-fills on LinkedIn job pages | 1 day |
| 5 | Kanban with drag and drop | Dragging changes status and logs history | 1 day |
| 6 | Already-applied banner + context-menu save | — | ½ day |
| 7 | Export/Import JSON + CSV | Round-trip backup works | ½ day |
| 8 | Icons, store screenshots, privacy policy (GitHub Pages) | Ready to submit | ½ day |
| **MVP** | **about 1–1.5 weeks part-time** | | |
| 9+ | v2 features | | |

## 8. Deployment checklist
1. Pay the one-time **$5** Chrome Web Store developer fee
2. Write a privacy policy ("all data is stored locally; nothing is collected or sent") and host it on GitHub Pages
3. Run `wxt zip`, upload, fill in the listing (description, 1280×800 screenshots, 128px icon, single-purpose statement, a justification for each permission)
4. Review time varies, typically days; minimal permissions help
5. Run `wxt zip -b edge` / `-b firefox` to publish on Edge Add-ons (free) and Firefox too
6. Code on a public GitHub repo, which also counts for a CV or portfolio

## 9. Risks
| Risk | Mitigation |
|---|---|
| LinkedIn changes its HTML | JSON-LD first; one isolated extractor file per site; fixture tests; manual editing always available |
| LinkedIn may not emit JSON-LD on logged-in job views | **Verify on a live page in milestone 4**; fall back to selectors |
| Scraping and terms of service | Only read the page the user is viewing, on their click. No crawling, no background fetching |
| Data loss on uninstall | Prominent Export button; a "back up now" reminder every N saves |
| MV3 service worker sleeps | Keep no state in memory; everything lives in storage; use `chrome.alarms` for timers |

## Sources
- Competitors: [Huntr review 2026](https://www.weekday.works/post/huntr-review), [Teal review 2026](https://www.weekday.works/post/teal-hq-review), [Huntr vs Teal vs JobShinobi](https://jobshinobi.com/compare/huntr-vs-teal-vs-jobshinobi-2026), [Best job trackers 2026](https://resumly.ai/best/best-job-application-trackers)
- Supabase: [Official: free project pausing](https://supabase.com/kb/faqs/platform/free-project-pausing), [Free tier limits 2026](https://automationatlas.io/answers/supabase-free-tier-limits-2026/), [auth-js MV3 session issue](https://github.com/supabase/auth-js/issues/456)
- Chrome storage: [chrome.storage API docs](https://developer.chrome.com/extensions/storage)
- WXT: [Plasmo vs WXT vs CRXJS (2026)](https://merginit.com/blog/23082026-plasmo-vs-wxt-vs-crxjs-extension-js), [WXT + React guide](https://dev.to/seryllns_/build-modern-browser-extensions-with-wxt-react-and-typescript-h3h)
- Store: [Chrome Web Store fee 2026](https://extensionbooster.net/blog/chrome-web-store-developer-registration-fee-2026-guide/), [Publishing guide](https://theluckystrike.github.io/chrome-extension-guide/docs/tutorials/publishing-to-chrome-web-store)
- JSON-LD on LinkedIn: [Apify LinkedIn extractor notes](https://apify.com/second_coming/linkedin-data-extractor)
