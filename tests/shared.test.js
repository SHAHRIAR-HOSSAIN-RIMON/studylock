const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../studylock/shared.js');

test('normalizeSite cleans up links and rejects junk', () => {
  assert.equal(s.normalizeSite('https://www.YouTube.com/watch?v=1'), 'youtube.com');
  assert.equal(s.normalizeSite('  m.facebook.com/  '), 'm.facebook.com');
  assert.equal(s.normalizeSite('reddit.com:443/r/all'), 'reddit.com');
  assert.equal(s.normalizeSite('news.google.com#top'), 'news.google.com');
  assert.equal(s.normalizeSite('youtube'), null);
  assert.equal(s.normalizeSite('hello world.com'), null);
  assert.equal(s.normalizeSite(''), null);
  assert.equal(s.normalizeSite(42), null);
});

test('hostMatches includes subdomains but not lookalikes', () => {
  const sites = ['youtube.com', 'x.com'];
  assert.ok(s.hostMatches('www.youtube.com', sites));
  assert.ok(s.hostMatches('m.youtube.com', sites));
  assert.ok(s.hostMatches('x.com', sites));
  assert.ok(!s.hostMatches('notyoutube.com', sites));
  assert.ok(!s.hostMatches('box.com', sites));
});

test('sanitizeSettings clamps bad values and dedupes sites', () => {
  const out = s.sanitizeSettings({ focusMin: 0, shortBreakMin: '10', strictMode: 'yes', sites: ['YouTube.com', 'youtube.com', 'bad site'] });
  assert.equal(out.focusMin, 25);
  assert.equal(out.shortBreakMin, 10);
  assert.equal(out.strictMode, false);
  assert.deepEqual(out.sites, ['youtube.com']);
});

test('formatTime rounds up to whole seconds', () => {
  assert.equal(s.formatTime(25 * 60000), '25:00');
  assert.equal(s.formatTime(61001), '01:02');
  assert.equal(s.formatTime(0), '00:00');
});
