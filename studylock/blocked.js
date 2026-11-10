const $ = (id) => document.getElementById(id);

const TIPS = [
  'Small steps every day add up to big results.',
  'The scroll will still be there after this session. Your exam won’t wait.',
  'Focus now, relax later — your break is coming soon.',
  'One focused hour beats three distracted ones.',
  'Future you will be glad you stayed on task.',
  'Close the tab, finish the chapter.',
  'Discipline is choosing what you want most over what you want now.'
];
$('quote').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];

let timer = null;

function render() {
  if (!timer) return;
  document.body.dataset.phase = timer.phase;
  if (isBlocking(timer)) {
    $('title').textContent = 'This site is blocked while you focus';
    $('subtitle').textContent =
      timer.status === 'paused' ? 'Your focus session is paused, but blocking stays on.' : 'Time left in this focus session:';
    $('time').textContent = formatTime(remainingMs(timer));
    $('time').classList.remove('hidden');
  } else {
    $('title').textContent = 'Focus session over 🎉';
    $('subtitle').textContent = 'Blocking is off. You can go back to the site now.';
    $('time').classList.add('hidden');
  }
}

async function load() {
  const data = await chrome.storage.local.get('timer');
  timer = data.timer || null;
  render();
}

$('back').addEventListener('click', () => {
  if (history.length > 1) history.back();
  else window.close();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.timer) {
    timer = changes.timer.newValue;
    render();
  }
});

load();
setInterval(render, 500);
