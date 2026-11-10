const $ = (id) => document.getElementById(id);
const CIRCUMFERENCE = 2 * Math.PI * 80;

let state = { settings: DEFAULT_SETTINGS, timer: initialTimer(DEFAULT_SETTINGS), stats: {} };

async function load() {
  const data = await chrome.storage.local.get(['settings', 'timer', 'stats']);
  const settings = sanitizeSettings(data.settings);
  state = {
    settings,
    timer: data.timer && data.timer.phase ? data.timer : initialTimer(settings),
    stats: data.stats || {}
  };
  render();
}

function render() {
  const { settings, timer, stats } = state;
  document.body.dataset.phase = timer.phase;

  const left = remainingMs(timer);
  const total = timer.durationMs || phaseMinutes(timer.phase, settings) * 60000;
  $('time').textContent = formatTime(left);
  $('phase').textContent = PHASE_LABELS[timer.phase];

  const progress = $('progress');
  progress.style.strokeDasharray = String(CIRCUMFERENCE);
  progress.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - Math.min(1, left / total)));

  const locked = settings.strictMode && timer.phase === 'focus' && timer.status === 'running';
  const main = $('main');
  if (timer.status === 'running') {
    main.textContent = 'Pause';
    main.disabled = locked;
    $('statusText').textContent = timer.phase === 'focus' ? 'Stay focused' : 'Relax';
  } else if (timer.status === 'paused') {
    main.textContent = 'Resume';
    main.disabled = false;
    $('statusText').textContent = 'Paused';
  } else {
    main.textContent = timer.phase === 'focus' ? 'Start focus' : 'Start break';
    main.disabled = false;
    $('statusText').textContent = 'Ready';
  }
  $('reset').disabled = locked;
  $('skip').disabled = locked;
  main.title = locked ? 'Strict mode is on' : '';

  // Progress dots towards the long break.
  const dots = $('dots');
  dots.textContent = '';
  for (let i = 0; i < settings.longBreakEvery; i++) {
    const d = document.createElement('span');
    if (i < timer.cycleCount % settings.longBreakEvery || (timer.phase === 'longBreak' && timer.cycleCount > 0)) {
      d.className = 'done';
    }
    dots.appendChild(d);
  }

  const today = stats[dayKey()] || { sessions: 0, minutes: 0 };
  $('today').textContent = `Today: ${today.sessions} session${today.sessions === 1 ? '' : 's'} · ${today.minutes} min`;
  $('blockInfo').textContent = isBlocking(timer)
    ? `🔒 ${settings.sites.length} sites blocked`
    : `${settings.sites.length} sites on block list`;
}

async function send(command) {
  $('error').textContent = '';
  try {
    const res = await chrome.runtime.sendMessage({ type: 'command', command });
    if (res && res.error) $('error').textContent = res.error;
    if (res && res.timer) {
      state.timer = res.timer;
      render();
    }
  } catch (e) {
    $('error').textContent = 'Something went wrong. Try reopening the popup.';
    console.error(e);
  }
}

$('main').addEventListener('click', () => {
  send(state.timer.status === 'running' ? 'pause' : 'start');
});
$('reset').addEventListener('click', () => send('reset'));
$('skip').addEventListener('click', () => send('skip'));
$('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());

// Firefox treats host permissions as optional; ask for them if missing.
async function checkPermission() {
  try {
    const ok = await chrome.permissions.contains({ origins: ['<all_urls>'] });
    $('permBanner').classList.toggle('hidden', ok);
  } catch {
    /* permissions API unavailable: ignore */
  }
}
$('grantPerm').addEventListener('click', async () => {
  try {
    await chrome.permissions.request({ origins: ['<all_urls>'] });
  } finally {
    checkPermission();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') load();
});

load();
checkPermission();
setInterval(render, 250);
