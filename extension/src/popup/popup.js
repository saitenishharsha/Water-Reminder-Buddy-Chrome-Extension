import { formatClock, formatCountdown } from '../shared/settings.js';

const $ = (id) => document.getElementById(id);
const RING = 2 * Math.PI * 52;
const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

let status = null;

function send(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => {
      void chrome.runtime.lastError;
      resolve(res || {});
    });
  });
}

async function load() {
  status = await send({ type: 'drip:getStatus' });
  if (!status || !status.settings) return;
  // keep the local clock in step with the service worker
  status.offset = status.now - Date.now();
  renderStatic();
  renderTimer();
}

function renderStatic() {
  const { settings, state, today, history } = status;
  $('enabled').checked = settings.enabled;
  $('todayCount').textContent = today;
  $('goal').textContent = settings.dailyGoal;
  $('minus').disabled = today <= 0;

  const pips = $('pips');
  pips.replaceChildren();
  const shown = Math.min(settings.dailyGoal, 16);
  for (let i = 0; i < shown; i++) {
    const p = document.createElement('span');
    p.className = 'pip' + (i < Math.min(today, settings.dailyGoal) ? ' full' : '');
    pips.append(p);
  }

  const week = $('week');
  week.replaceChildren();
  const max = Math.max(settings.dailyGoal, ...history.map((d) => d.count));
  history.forEach((d, i) => {
    const col = document.createElement('div');
    col.className = 'day' + (i === history.length - 1 ? ' is-today' : '');
    col.title = `${new Date(d.date).toLocaleDateString([], { weekday: 'long' })}: ${d.count} glass${d.count === 1 ? '' : 'es'}`;
    const bar = document.createElement('div');
    bar.className = 'bar' + (d.count >= settings.dailyGoal ? ' met' : d.count > 0 ? ' part' : '');
    bar.style.height = `${Math.max(6, Math.round((d.count / max) * 46))}px`;
    const lbl = document.createElement('span');
    lbl.textContent = DAY[new Date(d.date).getDay()];
    col.append(bar, lbl);
    week.append(col);
  });

  const paused = state.pausedUntil > Date.now() + status.offset;
  $('pauseBtn').textContent = paused ? 'Resume' : 'Pause ▾';
  $('pauseBtn').setAttribute('aria-expanded', 'false');
  $('pauseMenu').hidden = true;
  $('pauseBtn').disabled = !settings.enabled;
}

function renderTimer() {
  if (!status || !status.settings) return;
  const { settings, state } = status;
  const now = Date.now() + (status.offset || 0);
  const card = $('timerCard');
  let label = 'Next sip in';
  let countdown = '--:--';
  let meta = '';
  let progress = 0;
  let off = false;

  if (!settings.enabled) {
    off = true; label = 'Reminders are off'; countdown = 'Off'; meta = 'Flip the switch to start again.';
  } else if (state.pausedUntil > now) {
    off = true; label = 'Paused'; countdown = formatCountdown(state.pausedUntil - now);
    meta = `Back at ${formatClock(state.pausedUntil)}${isTomorrow(state.pausedUntil, now) ? ' tomorrow' : ''}`;
  } else if (state.pendingIdle) {
    off = true; label = 'Waiting for you'; countdown = 'Away';
    meta = "I'll remind you when you're back.";
  } else if (state.nextAt) {
    countdown = formatCountdown(state.nextAt - now);
    const total = state.nextAt - (state.intervalStart || state.nextAt - settings.intervalMin * 60000);
    progress = total > 0 ? Math.min(1, Math.max(0, (now - (state.nextAt - total)) / total)) : 0;
    if (state.nextReason === 'snooze') meta = `Snoozed · at ${formatClock(state.nextAt)}`;
    else if (state.nextReason === 'active-hours') { label = 'Outside active hours'; meta = `Starts ${dayName(state.nextAt, now)} ${formatClock(state.nextAt)}`; }
    else if (state.nextReason === 'return') meta = 'Welcome back!';
    else meta = `at ${formatClock(state.nextAt)} · every ${settings.intervalMin} min`;
    if (state.nextAt - now <= 0) countdown = 'Now!';
  }

  card.classList.toggle('off', off);
  $('timerLabel').textContent = label;
  $('countdown').textContent = countdown;
  $('timerMeta').textContent = meta;
  $('ringFg').style.strokeDasharray = String(RING);
  $('ringFg').style.strokeDashoffset = String(RING * (1 - (off ? 0 : progress)));
}

function isTomorrow(ts, now) {
  return new Date(ts).toDateString() !== new Date(now).toDateString();
}
function dayName(ts, now) {
  if (!isTomorrow(ts, now)) return 'today at';
  const d = new Date(now); d.setDate(d.getDate() + 1);
  if (new Date(ts).toDateString() === d.toDateString()) return 'tomorrow at';
  return new Date(ts).toLocaleDateString([], { weekday: 'long' }) + ' at';
}

function hint(text) {
  $('hint').textContent = text;
  clearTimeout(hint.t);
  hint.t = setTimeout(() => { $('hint').textContent = ''; }, 4000);
}

// ---------------------------------------------------------------- events

$('enabled').addEventListener('change', async (e) => {
  await send({ type: 'drip:setEnabled', enabled: e.target.checked });
  setTimeout(load, 150);
});

$('plus').addEventListener('click', async () => {
  await send({ type: 'drip:logDrink', delta: 1 });
  hint('Nice! Timer restarted. 💙');
  load();
});
$('minus').addEventListener('click', async () => {
  await send({ type: 'drip:logDrink', delta: -1 });
  load();
});

$('remindNow').addEventListener('click', async () => {
  $('remindNow').disabled = true;
  const res = await send({ type: 'drip:remindNow' });
  $('remindNow').disabled = false;
  if (res.where === 'overlay') window.close();
  else hint("This page can't show Drip, so I sent a notification instead.");
});

$('pauseBtn').addEventListener('click', async () => {
  const paused = status && status.state.pausedUntil > Date.now() + (status.offset || 0);
  if (paused) {
    await send({ type: 'drip:resume' });
    hint('Back on duty! 💧');
    load();
    return;
  }
  const menu = $('pauseMenu');
  menu.hidden = !menu.hidden;
  $('pauseBtn').setAttribute('aria-expanded', String(!menu.hidden));
});

$('pauseMenu').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-pause]');
  if (!btn) return;
  const value = btn.dataset.pause;
  await send({ type: 'drip:pause', minutes: value === 'tomorrow' ? 'tomorrow' : Number(value) });
  hint('Paused. Enjoy your break!');
  load();
});

$('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());

chrome.storage.onChanged.addListener(() => load());
setInterval(renderTimer, 1000);
load();
