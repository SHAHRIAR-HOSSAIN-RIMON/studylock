// Shared constants and helpers. Loaded by the background script, popup, options and blocked pages.

const DEFAULT_SETTINGS = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  autoStartBreak: true,
  autoStartFocus: false,
  strictMode: false,
  sites: [
    'youtube.com',
    'facebook.com',
    'instagram.com',
    'tiktok.com',
    'x.com',
    'twitter.com',
    'reddit.com',
    'netflix.com'
  ]
};

const PHASE_LABELS = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break'
};

/** Minutes for a phase under the given settings. */
function phaseMinutes(phase, settings) {
  if (phase === 'focus') return settings.focusMin;
  if (phase === 'longBreak') return settings.longBreakMin;
  return settings.shortBreakMin;
}

/** Fresh timer state: focus phase, waiting to start. */
function initialTimer(settings) {
  return {
    phase: 'focus',
    status: 'ready', // 'ready' | 'running' | 'paused'
    endAt: null,
    remainingMs: settings.focusMin * 60000,
    durationMs: settings.focusMin * 60000, // full length of the current phase, for progress and stats
    cycleCount: 0 // focus sessions finished in the current cycle (resets after a long break)
  };
}

/** Milliseconds left on the timer at time `now`. */
function remainingMs(timer, now = Date.now()) {
  if (timer.status === 'running') return Math.max(0, timer.endAt - now);
  return timer.remainingMs;
}

/** Is site blocking active for this timer state? */
function isBlocking(timer) {
  return timer.phase === 'focus' && timer.status !== 'ready';
}

/**
 * Turn user input such as "https://www.YouTube.com/watch?v=1" into "youtube.com".
 * Returns null if it does not look like a domain.
 */
function normalizeSite(input) {
  if (typeof input !== 'string') return null;
  let s = input.trim().toLowerCase();
  s = s.replace(/^[a-z]+:\/\//, ''); // protocol
  s = s.split(/[/?#]/)[0]; // path, query, hash
  s = s.replace(/:\d+$/, ''); // port
  s = s.replace(/^www\./, '');
  s = s.replace(/\.$/, '');
  if (!/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(s)) return null;
  return s;
}

/** Does hostname belong to one of the blocked sites (including subdomains)? */
function hostMatches(hostname, sites) {
  const h = hostname.toLowerCase().replace(/^www\./, '');
  return sites.some((s) => h === s || h.endsWith('.' + s));
}

/** Local date key like "2026-11-10". */
function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 1500000 -> "25:00" */
function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Merge stored settings over defaults, ignoring unknown or invalid values. */
function sanitizeSettings(stored) {
  const out = { ...DEFAULT_SETTINGS };
  if (!stored || typeof stored !== 'object') return out;
  const clampInt = (v, min, max, fallback) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
  };
  out.focusMin = clampInt(stored.focusMin, 1, 180, out.focusMin);
  out.shortBreakMin = clampInt(stored.shortBreakMin, 1, 60, out.shortBreakMin);
  out.longBreakMin = clampInt(stored.longBreakMin, 1, 120, out.longBreakMin);
  out.longBreakEvery = clampInt(stored.longBreakEvery, 1, 12, out.longBreakEvery);
  for (const k of ['autoStartBreak', 'autoStartFocus', 'strictMode']) {
    if (typeof stored[k] === 'boolean') out[k] = stored[k];
  }
  if (Array.isArray(stored.sites)) {
    out.sites = [...new Set(stored.sites.map(normalizeSite).filter(Boolean))];
  }
  return out;
}

// Allow Node tests to import these helpers.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_SETTINGS,
    PHASE_LABELS,
    phaseMinutes,
    initialTimer,
    remainingMs,
    isBlocking,
    normalizeSite,
    hostMatches,
    dayKey,
    formatTime,
    sanitizeSettings
  };
}
