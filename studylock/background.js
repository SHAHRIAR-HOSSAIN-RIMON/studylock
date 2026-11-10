// StudyLock background script.
// Chrome/Edge run this as a service worker; Firefox runs it as an event page with shared.js loaded first.
// All state lives in chrome.storage.local because the worker can be shut down at any time.

if (typeof DEFAULT_SETTINGS === 'undefined' && typeof importScripts === 'function') {
  importScripts('shared.js');
}

const BLOCK_RULE_ID = 1;
const ALARM_PHASE_END = 'phaseEnd';
const ALARM_TICK = 'tick';
const BADGE_COLORS = { focus: '#E5484D', shortBreak: '#30A46C', longBreak: '#0090FF' };

// ---------- storage helpers ----------

async function loadState() {
  const data = await chrome.storage.local.get(['settings', 'timer', 'stats']);
  const settings = sanitizeSettings(data.settings);
  const timer = data.timer && data.timer.phase ? data.timer : initialTimer(settings);
  const stats = data.stats && typeof data.stats === 'object' ? data.stats : {};
  return { settings, timer, stats };
}

async function saveTimer(timer) {
  await chrome.storage.local.set({ timer });
}

// Run state-changing operations one at a time so alarms and clicks can't interleave.
let queue = Promise.resolve();
function serialize(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

// ---------- side effects: blocking, badge, alarms, notifications ----------

async function applyBlocking(timer, settings) {
  const addRules =
    isBlocking(timer) && settings.sites.length > 0
      ? [
          {
            id: BLOCK_RULE_ID,
            priority: 1,
            action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
            condition: { requestDomains: settings.sites, resourceTypes: ['main_frame'] }
          }
        ]
      : [];
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [BLOCK_RULE_ID], addRules });
}

/** Send tabs that are already open on a blocked site to the blocked page. */
async function redirectOpenBlockedTabs(settings) {
  if (settings.sites.length === 0) return;
  const blockedUrl = chrome.runtime.getURL('blocked.html');
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.url) continue;
    let host;
    try {
      const u = new URL(tab.url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      host = u.hostname;
    } catch {
      continue;
    }
    if (hostMatches(host, settings.sites)) {
      chrome.tabs.update(tab.id, { url: blockedUrl }).catch(() => {});
    }
  }
}

async function updateBadge(timer) {
  let text = '';
  if (timer.status === 'running') {
    text = String(Math.ceil(remainingMs(timer) / 60000));
  } else if (timer.status === 'paused') {
    text = '||';
  }
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS[timer.phase] || '#666' });
  if (chrome.action.setBadgeTextColor) {
    await chrome.action.setBadgeTextColor({ color: '#FFFFFF' }).catch(() => {});
  }
}

async function scheduleAlarms(timer) {
  await chrome.alarms.clear(ALARM_PHASE_END);
  await chrome.alarms.clear(ALARM_TICK);
  if (timer.status === 'running') {
    await chrome.alarms.create(ALARM_PHASE_END, { when: timer.endAt });
    await chrome.alarms.create(ALARM_TICK, { periodInMinutes: 0.5 });
  }
}

function notify(title, message) {
  chrome.notifications
    .create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
      priority: 2
    })
    .catch(() => {});
}

/** Persist the timer and bring blocking, alarms and badge in line with it. */
async function commit(timer, settings, { wasBlocking } = {}) {
  await saveTimer(timer);
  await applyBlocking(timer, settings);
  await scheduleAlarms(timer);
  await updateBadge(timer);
  if (isBlocking(timer) && !wasBlocking) {
    await redirectOpenBlockedTabs(settings);
  }
}

// ---------- timer transitions ----------

function startedTimer(timer, settings, now) {
  if (timer.status === 'ready') {
    const ms = phaseMinutes(timer.phase, settings) * 60000;
    return { ...timer, status: 'running', endAt: now + ms, remainingMs: ms, durationMs: ms };
  }
  return { ...timer, status: 'running', endAt: now + timer.remainingMs };
}

function readyTimer(phase, settings, cycleCount) {
  return {
    phase,
    status: 'ready',
    endAt: null,
    remainingMs: phaseMinutes(phase, settings) * 60000,
    durationMs: phaseMinutes(phase, settings) * 60000,
    cycleCount
  };
}

/** The phase that follows `timer.phase`, and the cycle count after it. */
function nextPhase(timer, settings, countFocus) {
  if (timer.phase === 'focus') {
    const cycleCount = timer.cycleCount + (countFocus ? 1 : 0);
    const isLong = countFocus && cycleCount > 0 && cycleCount % settings.longBreakEvery === 0;
    return { phase: isLong ? 'longBreak' : 'shortBreak', cycleCount };
  }
  return { phase: 'focus', cycleCount: timer.phase === 'longBreak' ? 0 : timer.cycleCount };
}

function addFocusStats(stats, minutes, now) {
  const key = dayKey(new Date(now));
  const day = stats[key] || { sessions: 0, minutes: 0 };
  const updated = { ...stats, [key]: { sessions: day.sessions + 1, minutes: day.minutes + minutes } };
  // Keep about a year of history.
  const keys = Object.keys(updated).sort();
  while (keys.length > 366) delete updated[keys.shift()];
  return updated;
}

/** Called when a running phase reaches zero. */
async function completePhase(now = Date.now()) {
  const { settings, timer, stats } = await loadState();
  if (timer.status !== 'running' || timer.endAt > now + 1000) return timer; // not actually finished

  const wasBlocking = isBlocking(timer);
  if (timer.phase === 'focus') {
    const minutes = Math.round((timer.durationMs || settings.focusMin * 60000) / 60000);
    await chrome.storage.local.set({ stats: addFocusStats(stats, minutes, now) });
  }

  const { phase, cycleCount } = nextPhase(timer, settings, true);
  let next = readyTimer(phase, settings, cycleCount);
  const autoStart = phase === 'focus' ? settings.autoStartFocus : settings.autoStartBreak;
  if (autoStart) next = startedTimer(next, settings, now);

  if (timer.phase === 'focus') {
    notify(
      'Focus session done!',
      phase === 'longBreak'
        ? `Great work. Take a ${settings.longBreakMin}-minute long break.`
        : `Nice. Take a ${settings.shortBreakMin}-minute break.`
    );
  } else {
    notify('Break is over', autoStart ? 'Next focus session has started.' : 'Ready when you are. Open StudyLock to start focusing.');
  }

  await commit(next, settings, { wasBlocking });
  return next;
}

/** Catch up if the browser was closed or the alarm fired late. */
async function reconcile() {
  const { timer } = await loadState();
  if (timer.status === 'running' && timer.endAt <= Date.now()) {
    return completePhase();
  }
  return timer;
}

async function handleCommand(cmd) {
  await reconcile();
  const { settings, timer } = await loadState();
  const now = Date.now();
  const wasBlocking = isBlocking(timer);
  const locked = settings.strictMode && timer.phase === 'focus' && timer.status === 'running';

  let next = timer;
  switch (cmd) {
    case 'start':
      if (timer.status !== 'running') next = startedTimer(timer, settings, now);
      break;
    case 'pause':
      if (locked) return { error: 'Strict mode is on: you can’t pause a focus session.', timer };
      if (timer.status === 'running') {
        next = { ...timer, status: 'paused', remainingMs: remainingMs(timer, now), endAt: null };
      }
      break;
    case 'reset':
      if (locked) return { error: 'Strict mode is on: you can’t stop a focus session.', timer };
      next = initialTimer(settings);
      break;
    case 'skip': {
      if (locked) return { error: 'Strict mode is on: you can’t skip a focus session.', timer };
      const { phase, cycleCount } = nextPhase(timer, settings, false);
      next = readyTimer(phase, settings, cycleCount);
      break;
    }
    default:
      return { error: 'Unknown command', timer };
  }
  await commit(next, settings, { wasBlocking });
  return { timer: next };
}

// ---------- event listeners (registered synchronously at top level) ----------

chrome.runtime.onInstalled.addListener(() =>
  serialize(async () => {
    const data = await chrome.storage.local.get(['settings', 'timer']);
    const settings = sanitizeSettings(data.settings);
    const timer = data.timer && data.timer.phase ? data.timer : initialTimer(settings);
    await chrome.storage.local.set({ settings, timer });
    await commit(timer, settings, { wasBlocking: true });
    await reconcile();
  })
);

chrome.runtime.onStartup.addListener(() =>
  serialize(async () => {
    const { settings, timer } = await loadState();
    await commit(timer, settings, { wasBlocking: true });
    await reconcile();
  })
);

chrome.alarms.onAlarm.addListener((alarm) =>
  serialize(async () => {
    if (alarm.name === ALARM_PHASE_END) {
      await completePhase();
    } else if (alarm.name === ALARM_TICK) {
      const timer = await reconcile();
      await updateBadge(timer);
    }
  })
);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'command') return false;
  serialize(() => handleCommand(msg.command))
    .then(sendResponse)
    .catch((e) => sendResponse({ error: String(e && e.message ? e.message : e) }));
  return true; // keep the channel open for the async response
});

// When the user edits settings, keep blocking rules and an idle timer in sync.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.settings) return;
  serialize(async () => {
    const { settings, timer } = await loadState();
    let next = timer;
    if (timer.status === 'ready') {
      const ms = phaseMinutes(timer.phase, settings) * 60000;
      next = { ...timer, remainingMs: ms, durationMs: ms };
      await saveTimer(next);
    }
    await applyBlocking(next, settings);
    if (isBlocking(next)) await redirectOpenBlockedTabs(settings);
  });
});

// Exported for Node tests only.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { completePhase, handleCommand, reconcile, nextPhase, addFocusStats, serialize };
}
