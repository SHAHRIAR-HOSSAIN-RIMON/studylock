// Runs shared.js + background.js inside a sandbox with a fake `chrome` API and a controllable clock.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = path.join(__dirname, '..', 'studylock');
const MIN = 60000;

function makeBrowser({ tabs = [] } = {}) {
  const store = {};
  const listeners = { installed: [], startup: [], alarm: [], message: [], changed: [] };
  const log = { rules: [], alarms: {}, notifications: [], tabUpdates: [], badge: '' };

  const chrome = {
    storage: {
      local: {
        async get(keys) {
          const list = Array.isArray(keys) ? keys : [keys];
          const out = {};
          for (const k of list) if (k in store) out[k] = structuredClone(store[k]);
          return out;
        },
        async set(obj) {
          const changes = {};
          for (const [k, v] of Object.entries(obj)) {
            changes[k] = { oldValue: store[k], newValue: structuredClone(v) };
            store[k] = structuredClone(v);
          }
          listeners.changed.forEach((fn) => fn(changes, 'local'));
        }
      },
      onChanged: { addListener: (fn) => listeners.changed.push(fn) }
    },
    declarativeNetRequest: {
      async updateDynamicRules({ removeRuleIds, addRules }) {
        log.rules = log.rules.filter((r) => !removeRuleIds.includes(r.id)).concat(addRules);
      }
    },
    alarms: {
      async create(name, info) { log.alarms[name] = info; },
      async clear(name) { delete log.alarms[name]; },
      onAlarm: { addListener: (fn) => listeners.alarm.push(fn) }
    },
    action: {
      async setBadgeText({ text }) { log.badge = text; },
      async setBadgeBackgroundColor() {},
      async setBadgeTextColor() {}
    },
    notifications: { async create(n) { log.notifications.push(n); } },
    tabs: {
      async query() { return tabs; },
      async update(id, props) { log.tabUpdates.push({ id, ...props }); }
    },
    runtime: {
      getURL: (p) => `chrome-extension://abc/${p}`,
      onInstalled: { addListener: (fn) => listeners.installed.push(fn) },
      onStartup: { addListener: (fn) => listeners.startup.push(fn) },
      onMessage: { addListener: (fn) => listeners.message.push(fn) }
    }
  };

  const ctx = vm.createContext({ chrome, console, structuredClone, URL, __now: Date.UTC(2026, 10, 10, 9, 0) });
  vm.runInContext('Date.now = () => globalThis.__now;', ctx);
  vm.runInContext(fs.readFileSync(path.join(SRC, 'shared.js'), 'utf8'), ctx, { filename: 'shared.js' });
  vm.runInContext(fs.readFileSync(path.join(SRC, 'background.js'), 'utf8'), ctx, { filename: 'background.js' });

  const b = {
    ctx,
    store,
    log,
    get now() { return ctx.__now; },
    advance(ms) { ctx.__now += ms; },
    idle: () => ctx.serialize(() => {}), // wait for queued work
    async install() { listeners.installed.forEach((fn) => fn({ reason: 'install' })); await b.idle(); await b.idle(); },
    async command(c) {
      return new Promise((resolve) => listeners.message.forEach((fn) => fn({ type: 'command', command: c }, {}, resolve)));
    },
    async fireAlarm(name) { listeners.alarm.forEach((fn) => fn({ name })); await b.idle(); },
    async setSettings(patch) {
      await chrome.storage.local.set({ settings: { ...store.settings, ...patch } });
      await b.idle();
      await b.idle();
    }
  };
  return b;
}

test('install writes default settings and a ready focus timer, no blocking', async () => {
  const b = makeBrowser();
  await b.install();
  assert.equal(b.store.settings.focusMin, 25);
  assert.ok(b.store.settings.sites.includes('youtube.com'));
  assert.equal(b.store.timer.phase, 'focus');
  assert.equal(b.store.timer.status, 'ready');
  assert.equal(b.log.rules.length, 0);
});

test('starting focus blocks sites, schedules alarm, redirects open blocked tabs', async () => {
  const b = makeBrowser({
    tabs: [
      { id: 1, url: 'https://www.youtube.com/watch?v=x' },
      { id: 2, url: 'https://m.facebook.com/' },
      { id: 3, url: 'https://www.google.com/' },
      { id: 4, url: 'chrome://extensions' }
    ]
  });
  await b.install();
  const res = await b.command('start');
  assert.equal(res.timer.status, 'running');
  assert.equal(res.timer.endAt, b.now + 25 * MIN);
  assert.equal(b.log.rules.length, 1);
  assert.equal(b.log.rules[0].action.redirect.extensionPath, '/blocked.html');
  assert.deepEqual([...b.log.rules[0].condition.requestDomains], [...b.store.settings.sites]);
  assert.equal(b.log.alarms.phaseEnd.when, b.now + 25 * MIN);
  assert.deepEqual(b.log.tabUpdates.map((t) => t.id), [1, 2]);
  assert.equal(b.log.badge, '25');
});

test('pause keeps remaining time and blocking; resume continues from there', async () => {
  const b = makeBrowser();
  await b.install();
  await b.command('start');
  b.advance(10 * MIN);
  let res = await b.command('pause');
  assert.equal(res.timer.status, 'paused');
  assert.equal(res.timer.remainingMs, 15 * MIN);
  assert.equal(b.log.rules.length, 1, 'still blocking while paused');
  assert.equal(b.log.alarms.phaseEnd, undefined);
  b.advance(60 * MIN);
  res = await b.command('start');
  assert.equal(res.timer.endAt, b.now + 15 * MIN);
});

test('finishing focus records stats, notifies, unblocks and auto-starts the break', async () => {
  const b = makeBrowser();
  await b.install();
  await b.command('start');
  b.advance(25 * MIN);
  await b.fireAlarm('phaseEnd');
  const t = b.store.timer;
  assert.equal(t.phase, 'shortBreak');
  assert.equal(t.status, 'running');
  assert.equal(t.cycleCount, 1);
  assert.equal(b.log.rules.length, 0);
  assert.equal(b.log.notifications.length, 1);
  const day = Object.values(b.store.stats)[0];
  assert.deepEqual({ ...day }, { sessions: 1, minutes: 25 });
});

test('paused-then-resumed focus still counts the full session length in stats', async () => {
  const b = makeBrowser();
  await b.install();
  await b.command('start');
  b.advance(10 * MIN);
  await b.command('pause');
  await b.command('start');
  b.advance(15 * MIN);
  await b.fireAlarm('phaseEnd');
  assert.equal(Object.values(b.store.stats)[0].minutes, 25);
});

test('every 4th focus session leads to a long break, then the cycle resets', async () => {
  const b = makeBrowser();
  await b.install();
  for (let i = 1; i <= 4; i++) {
    if (b.store.timer.status !== 'running') await b.command('start');
    b.advance(25 * MIN);
    await b.fireAlarm('phaseEnd'); // focus -> break (auto-started)
    if (i < 4) {
      assert.equal(b.store.timer.phase, 'shortBreak');
      b.advance(5 * MIN);
      await b.fireAlarm('phaseEnd'); // break -> focus (ready, autoStartFocus off)
      assert.equal(b.store.timer.phase, 'focus');
      assert.equal(b.store.timer.status, 'ready');
    }
  }
  assert.equal(b.store.timer.phase, 'longBreak');
  assert.equal(b.store.timer.remainingMs, 15 * MIN);
  b.advance(15 * MIN);
  await b.fireAlarm('phaseEnd');
  assert.equal(b.store.timer.phase, 'focus');
  assert.equal(b.store.timer.cycleCount, 0);
  assert.equal(Object.values(b.store.stats)[0].sessions, 4);
});

test('strict mode refuses pause, skip and reset during a running focus session', async () => {
  const b = makeBrowser();
  await b.install();
  await b.setSettings({ strictMode: true });
  await b.command('start');
  for (const c of ['pause', 'skip', 'reset']) {
    const res = await b.command(c);
    assert.match(res.error, /Strict mode/);
  }
  assert.equal(b.store.timer.status, 'running');
  assert.equal(b.log.rules.length, 1);
});

test('skip from focus goes to a ready break without counting a session', async () => {
  const b = makeBrowser();
  await b.install();
  await b.command('start');
  const res = await b.command('skip');
  assert.equal(res.timer.phase, 'shortBreak');
  assert.equal(res.timer.status, 'ready');
  assert.equal(res.timer.cycleCount, 0);
  assert.equal(b.store.stats, undefined);
  assert.equal(b.log.rules.length, 0);
});

test('reset returns to a fresh focus timer and unblocks', async () => {
  const b = makeBrowser();
  await b.install();
  await b.command('start');
  const res = await b.command('reset');
  assert.equal(res.timer.status, 'ready');
  assert.equal(res.timer.phase, 'focus');
  assert.equal(b.log.rules.length, 0);
  assert.equal(b.log.badge, '');
});

test('if the browser was closed past the end time, the next command catches up first', async () => {
  const b = makeBrowser();
  await b.install();
  await b.setSettings({ autoStartBreak: false });
  await b.command('start');
  b.advance(3 * 60 * MIN);
  const res = await b.command('start'); // user opens popup hours later and presses Start
  assert.equal(Object.values(b.store.stats)[0].sessions, 1);
  assert.equal(res.timer.phase, 'shortBreak');
  assert.equal(res.timer.status, 'running');
});

test('changing focus length while ready updates the timer; editing sites while focusing updates rules', async () => {
  const b = makeBrowser();
  await b.install();
  await b.setSettings({ focusMin: 50 });
  assert.equal(b.store.timer.remainingMs, 50 * MIN);
  await b.command('start');
  await b.setSettings({ sites: ['example.com'] });
  assert.deepEqual([...b.log.rules[0].condition.requestDomains], ['example.com']);
});

test('empty block list means no rule (an empty requestDomains would be invalid)', async () => {
  const b = makeBrowser();
  await b.install();
  await b.setSettings({ sites: [] });
  await b.command('start');
  assert.equal(b.log.rules.length, 0);
});
