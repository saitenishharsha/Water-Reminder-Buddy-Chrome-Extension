import { getSettings, saveSettings, resetSettings, getTodayCount, resetToday, ALL_CORNERS } from '../shared/settings.js';

const $ = (id) => document.getElementById(id);
let settings = null;

// ---------------------------------------------------------------- helpers

let toastTimer = 0;
function toast(text = 'Saved ✓') {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1400);
}

async function save(patch, message) {
  settings = await saveSettings(patch);
  render();
  toast(message);
}

function send(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, (res) => { void chrome.runtime.lastError; resolve(res || {}); }));
}

// ---------------------------------------------------------------- render

async function render() {
  const s = settings;
  $('enabled').checked = s.enabled;
  $('intervalRange').value = String(Math.min(180, Math.max(5, s.intervalMin)));
  $('intervalMin').value = String(s.intervalMin);
  document.querySelectorAll('.js-interval').forEach((el) => { el.textContent = s.intervalMin; });
  for (const chip of $('intervalPresets').children) chip.classList.toggle('on', Number(chip.dataset.v) === s.intervalMin);
  setSelect($('snoozeMin'), s.snoozeMin);

  for (const b of $('animation').children) b.setAttribute('aria-checked', String(b.dataset.v === s.animation));
  for (const b of $('size').children) b.setAttribute('aria-checked', String(b.dataset.v === s.size));
  for (const c of $('corners').querySelectorAll('.corner')) {
    const on = s.corners.includes(c.dataset.v);
    c.classList.toggle('on', on);
    c.setAttribute('aria-pressed', String(on));
  }
  $('sound').checked = s.sound;
  setSelect($('autoHideSec'), s.autoHideSec);

  $('activeHoursEnabled').checked = s.activeHoursEnabled;
  $('activeHoursBox').classList.toggle('disabled', !s.activeHoursEnabled);
  $('activeStart').value = s.activeStart;
  $('activeEnd').value = s.activeEnd;
  for (const chip of $('activeDays').children) chip.classList.toggle('on', s.activeDays.includes(Number(chip.dataset.v)));
  $('pauseWhenIdle').checked = s.pauseWhenIdle;
  $('systemNotification').checked = s.systemNotification;

  $('dailyGoal').value = String(s.dailyGoal);
  $('glassMl').value = String(s.glassMl);
  $('goalLitres').textContent = `That's about ${((s.dailyGoal * s.glassMl) / 1000).toFixed(1)} litres a day.`;
  $('showBadge').checked = s.showBadge;
  const today = await getTodayCount();
  $('todayText').textContent = `${today} of ${s.dailyGoal} glasses so far.`;
}

/** Select an option, adding it if the stored value isn't in the list. */
function setSelect(select, value) {
  const v = String(value);
  if (![...select.options].some((o) => o.value === v)) {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = `${v} ${select.id === 'autoHideSec' ? 'sec' : 'min'}`;
    select.append(opt);
  }
  select.value = v;
}

// ---------------------------------------------------------------- preview

async function preview(mode) {
  if (typeof window.__dripShow !== 'function') return;
  const s = settings;
  const corner = s.corners[Math.floor(Math.random() * s.corners.length)];
  window.__dripShow({
    mode, corner, size: s.size, sound: s.sound, autoHideSec: s.autoHideSec,
    snoozeMin: s.snoozeMin, count: await getTodayCount(), goal: s.dailyGoal, preview: true
  });
}

// ---------------------------------------------------------------- wire up

function bindSwitch(id) {
  $(id).addEventListener('change', (e) => save({ [id]: e.target.checked }));
}

async function init() {
  settings = await getSettings();
  $('version').textContent = `Version ${chrome.runtime.getManifest().version}`;
  if (new URLSearchParams(location.search).get('welcome') === '1') $('welcome').hidden = false;
  await render();

  ['enabled', 'sound', 'activeHoursEnabled', 'pauseWhenIdle', 'systemNotification', 'showBadge'].forEach(bindSwitch);

  // interval: slider updates live, saves on release
  $('intervalRange').addEventListener('input', (e) => { $('intervalMin').value = e.target.value; });
  $('intervalRange').addEventListener('change', (e) => save({ intervalMin: Number(e.target.value) }, 'Saved ✓ Timer restarted'));
  $('intervalMin').addEventListener('change', (e) => save({ intervalMin: Number(e.target.value) }, 'Saved ✓ Timer restarted'));
  $('intervalPresets').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) save({ intervalMin: Number(chip.dataset.v) }, 'Saved ✓ Timer restarted');
  });

  $('snoozeMin').addEventListener('change', (e) => save({ snoozeMin: Number(e.target.value) }));
  $('autoHideSec').addEventListener('change', (e) => save({ autoHideSec: Number(e.target.value) }));

  $('animation').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (b) save({ animation: b.dataset.v });
  });
  $('size').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (b) save({ size: b.dataset.v });
  });
  $('corners').addEventListener('click', (e) => {
    const c = e.target.closest('.corner');
    if (!c) return;
    const set = new Set(settings.corners);
    if (set.has(c.dataset.v)) {
      if (set.size === 1) { toast('Keep at least one corner'); return; }
      set.delete(c.dataset.v);
    } else set.add(c.dataset.v);
    save({ corners: ALL_CORNERS.filter((x) => set.has(x)) });
  });

  $('activeStart').addEventListener('change', (e) => { if (e.target.value) save({ activeStart: e.target.value }); });
  $('activeEnd').addEventListener('change', (e) => { if (e.target.value) save({ activeEnd: e.target.value }); });
  $('activeDays').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const d = Number(chip.dataset.v);
    const set = new Set(settings.activeDays);
    if (set.has(d)) {
      if (set.size === 1) { toast('Keep at least one day'); return; }
      set.delete(d);
    } else set.add(d);
    save({ activeDays: [...set] });
  });

  $('dailyGoal').addEventListener('change', (e) => save({ dailyGoal: Number(e.target.value) }));
  $('glassMl').addEventListener('change', (e) => save({ glassMl: Number(e.target.value) }));

  $('resetToday').addEventListener('click', async () => {
    await resetToday();
    await send({ type: 'drip:refreshBadge' });
    render();
    toast("Today's count reset");
  });
  $('resetAll').addEventListener('click', async () => {
    if (!confirm('Reset all Drip settings to their defaults? Your glass history is kept.')) return;
    settings = await resetSettings();
    render();
    toast('Settings reset');
  });

  document.querySelectorAll('[data-preview]').forEach((b) => b.addEventListener('click', () => preview(b.dataset.preview)));

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'sync' && changes.settings) { settings = await getSettings(); render(); }
    if (area === 'local' && changes.stats) render();
  });
}

init();
