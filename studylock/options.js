const $ = (id) => document.getElementById(id);

const PRESETS = {
  social: ['facebook.com', 'instagram.com', 'tiktok.com', 'x.com', 'twitter.com', 'snapchat.com', 'reddit.com', 'pinterest.com', 'threads.net', 'linkedin.com'],
  video: ['youtube.com', 'netflix.com', 'twitch.tv', 'primevideo.com', 'hotstar.com', 'disneyplus.com', 'vimeo.com'],
  news: ['cnn.com', 'bbc.com', 'news.google.com', 'nytimes.com', 'theguardian.com'],
  games: ['roblox.com', 'chess.com', 'poki.com', 'miniclip.com', 'crazygames.com', 'steampowered.com']
};

const NUMBER_FIELDS = ['focusMin', 'shortBreakMin', 'longBreakMin', 'longBreakEvery'];
const CHECK_FIELDS = ['autoStartBreak', 'autoStartFocus', 'strictMode'];

let settings = { ...DEFAULT_SETTINGS };

let toastTimer;
function toast(text = 'Saved') {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1400);
}

async function save(patch, message) {
  settings = sanitizeSettings({ ...settings, ...patch });
  await chrome.storage.local.set({ settings });
  renderSites();
  toast(message);
}

// ---------- timer fields ----------

function renderFields() {
  for (const f of NUMBER_FIELDS) $(f).value = settings[f];
  for (const f of CHECK_FIELDS) $(f).checked = settings[f];
}

for (const f of NUMBER_FIELDS) {
  $(f).addEventListener('change', (e) => {
    const before = settings[f];
    save({ [f]: e.target.value }).then(() => {
      if (settings[f] === before && String(before) !== e.target.value) toast('Value out of range — kept ' + before);
      $(f).value = settings[f];
    });
  });
}
for (const f of CHECK_FIELDS) {
  $(f).addEventListener('change', (e) => save({ [f]: e.target.checked }));
}

// ---------- block list ----------

function renderSites() {
  const chips = $('chips');
  chips.textContent = '';
  if (settings.sites.length === 0) {
    const p = document.createElement('span');
    p.className = 'muted';
    p.textContent = 'No sites blocked yet.';
    chips.appendChild(p);
  }
  for (const site of settings.sites) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.append(site);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = `Remove ${site}`;
    btn.textContent = '×';
    btn.addEventListener('click', () => save({ sites: settings.sites.filter((s) => s !== site) }, `Removed ${site}`));
    chip.appendChild(btn);
    chips.appendChild(chip);
  }
}

$('addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  $('siteError').textContent = '';
  const site = normalizeSite($('siteInput').value);
  if (!site) {
    $('siteError').textContent = 'That doesn’t look like a website. Try something like "youtube.com".';
    return;
  }
  if (settings.sites.includes(site)) {
    $('siteError').textContent = `${site} is already on the list.`;
    return;
  }
  $('siteInput').value = '';
  save({ sites: [...settings.sites, site] }, `Blocked ${site}`);
});

document.querySelectorAll('[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const list = PRESETS[btn.dataset.preset];
    const added = list.filter((s) => !settings.sites.includes(s));
    save({ sites: [...settings.sites, ...added] }, added.length ? `Added ${added.length} sites` : 'Already on the list');
  });
});

// ---------- stats ----------

function renderStats(stats) {
  const bars = $('bars');
  bars.textContent = '';
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ date: d, ...(stats[dayKey(d)] || { sessions: 0, minutes: 0 }) });
  }
  const max = Math.max(1, ...days.map((d) => d.minutes));
  for (const d of days) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    const value = document.createElement('b');
    value.textContent = d.minutes ? `${d.minutes}m` : '';
    const fill = document.createElement('div');
    fill.style.height = `${(d.minutes / max) * 100}%`;
    fill.title = `${d.sessions} sessions, ${d.minutes} minutes`;
    const label = document.createElement('span');
    label.textContent = d.date.toLocaleDateString(undefined, { weekday: 'short' });
    bar.append(value, fill, label);
    bars.appendChild(bar);
  }
  $('weekMinutes').textContent = days.reduce((a, d) => a + d.minutes, 0);
  $('weekSessions').textContent = days.reduce((a, d) => a + d.sessions, 0);

  // Streak: consecutive days with at least one session, counting back from today
  // (today without a session yet doesn't break the streak).
  let streak = 0;
  const d = new Date();
  if (!stats[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (stats[dayKey(d)] && stats[dayKey(d)].sessions > 0) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  $('streak').textContent = streak;
}

// ---------- backup ----------

$('exportBtn').addEventListener('click', async () => {
  const data = await chrome.storage.local.get(['settings', 'stats']);
  const blob = new Blob([JSON.stringify({ app: 'StudyLock', version: 1, ...data }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `studylock-backup-${dayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('importBtn').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'StudyLock') throw new Error('not a StudyLock backup');
    const stats = {};
    if (data.stats && typeof data.stats === 'object') {
      for (const [k, v] of Object.entries(data.stats)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && Number.isFinite(v.sessions) && Number.isFinite(v.minutes)) {
          stats[k] = { sessions: Math.max(0, Math.round(v.sessions)), minutes: Math.max(0, Math.round(v.minutes)) };
        }
      }
    }
    settings = sanitizeSettings(data.settings);
    await chrome.storage.local.set({ settings, stats });
    renderFields();
    renderSites();
    renderStats(stats);
    toast('Backup imported');
  } catch (err) {
    toast('Could not import: ' + err.message);
  }
});

$('clearStats').addEventListener('click', async () => {
  if (!confirm('Delete all focus history? This cannot be undone.')) return;
  await chrome.storage.local.set({ stats: {} });
  renderStats({});
  toast('Stats cleared');
});

// ---------- init ----------

(async () => {
  const data = await chrome.storage.local.get(['settings', 'stats']);
  settings = sanitizeSettings(data.settings);
  renderFields();
  renderSites();
  renderStats(data.stats || {});
})();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.stats) renderStats(changes.stats.newValue || {});
});
