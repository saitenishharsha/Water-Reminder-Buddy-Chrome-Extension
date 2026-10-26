// Drip – service worker.
// Owns the reminder schedule, decides where to show a reminder
// (animated overlay on the active tab, or a system notification) and
// records drinks. All state lives in chrome.storage so it survives
// the service worker being stopped.

import {
  getSettings, saveSettings, sanitizeSettings, getState, setState,
  getTodayCount, addDrinks, getHistory, isWithinActiveHours, nextActiveStart,
  formatClock, parseHM
} from './shared/settings.js';

const ALARM_REMIND = 'drip:remind';
const ALARM_MIDNIGHT = 'drip:midnight';
const NOTIF_ID = 'drip:reminder';
const IDLE_SECONDS = 300; // 5 minutes without input counts as "away"
const MIN = 60 * 1000;

// ---------------------------------------------------------------- schedule

async function scheduleAt(when, reason, { resetStart = true } = {}) {
  await chrome.alarms.clear(ALARM_REMIND);
  await chrome.alarms.create(ALARM_REMIND, { when });
  const patch = { nextAt: when, nextReason: reason, pendingIdle: false };
  if (resetStart) patch.intervalStart = Date.now();
  await setState(patch);
  await refreshBadge();
}

async function scheduleIn(minutes, reason) {
  return scheduleAt(Date.now() + minutes * MIN, reason);
}

async function clearSchedule() {
  await chrome.alarms.clear(ALARM_REMIND);
  await setState({ nextAt: null, intervalStart: null, pendingIdle: false });
  await refreshBadge();
}

/** Make sure an alarm exists that matches the stored state (after restarts/updates). */
async function ensureSchedule() {
  const s = await getSettings();
  if (!s.enabled) return clearSchedule();
  const st = await getState();
  if (st.pendingIdle) return refreshBadge();
  const alarm = await chrome.alarms.get(ALARM_REMIND);
  if (alarm) return refreshBadge();
  const now = Date.now();
  if (st.pausedUntil > now) return scheduleAt(st.pausedUntil, 'pause', { resetStart: false });
  if (st.nextAt && st.nextAt > now) return scheduleAt(st.nextAt, st.nextReason, { resetStart: false });
  return scheduleIn(s.intervalMin, 'interval');
}

async function scheduleMidnight() {
  const d = new Date();
  d.setHours(24, 0, 5, 0);
  await chrome.alarms.create(ALARM_MIDNIGHT, { when: d.getTime() });
}

// ---------------------------------------------------------------- reminder

async function onReminderAlarm() {
  const s = await getSettings();
  if (!s.enabled) return clearSchedule();

  const st = await getState();
  const now = Date.now();

  if (st.pausedUntil > now + 1000) return scheduleAt(st.pausedUntil, 'pause', { resetStart: false });
  if (st.pausedUntil) await setState({ pausedUntil: 0 });

  if (s.activeHoursEnabled && !isWithinActiveHours(new Date(), s)) {
    const next = nextActiveStart(new Date(), s);
    return scheduleAt(next ?? now + s.intervalMin * MIN, 'active-hours');
  }

  if (s.pauseWhenIdle) {
    const idle = await chrome.idle.queryState(IDLE_SECONDS);
    if (idle !== 'active') {
      // Wait until the user is back (handled in idle.onStateChanged).
      await chrome.alarms.clear(ALARM_REMIND);
      await setState({ pendingIdle: true, nextAt: null });
      return refreshBadge();
    }
  }

  // Schedule the next cycle first, so the timer keeps running even if
  // the reminder is ignored. Done/Snooze reschedule it again.
  await scheduleIn(s.intervalMin, 'interval');
  await showReminder(s, { forceOverlay: false });
}

async function buildOverlayConfig(s) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const mode = s.animation === 'random' ? pick(['peek', 'walk']) : s.animation;
  return {
    mode,
    corner: pick(s.corners),
    size: s.size,
    sound: s.sound,
    autoHideSec: s.autoHideSec,
    snoozeMin: s.snoozeMin,
    count: await getTodayCount(),
    goal: s.dailyGoal,
    preview: false
  };
}

async function getTargetTab() {
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
    if (!win || win.id === undefined) return { tabId: null, focused: false };
    const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
    return { tabId: tab ? tab.id : null, focused: !!win.focused };
  } catch {
    return { tabId: null, focused: false };
  }
}

async function injectOverlay(tabId, cfg) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['src/content/overlay.js'] });
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (c) => (typeof window.__dripShow === 'function' ? window.__dripShow(c) === true : false),
      args: [cfg]
    });
    return !!(res && res.result === true);
  } catch {
    // chrome:// pages, the Web Store, PDF viewer, etc. cannot be scripted.
    return false;
  }
}

/**
 * Show a reminder. Prefers the animated overlay on the active tab when Chrome
 * is focused; otherwise (or on pages that can't be scripted) falls back to a
 * system notification.
 */
async function showReminder(s, { forceOverlay }) {
  const cfg = await buildOverlayConfig(s);
  const { tabId, focused } = await getTargetTab();

  if (tabId !== null && (focused || forceOverlay)) {
    if (await injectOverlay(tabId, cfg)) {
      chrome.notifications.clear(NOTIF_ID);
      return 'overlay';
    }
  }
  if (s.systemNotification || forceOverlay) {
    await showNotification(s, cfg.count);
    return 'notification';
  }
  return 'none';
}

async function showNotification(s, count) {
  await chrome.notifications.clear(NOTIF_ID);
  await chrome.notifications.create(NOTIF_ID, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: 'Drink Water! 💧',
    message: `Time for a sip. ${count} / ${s.dailyGoal} glasses today.`,
    buttons: [{ title: '💧 I drank water' }, { title: `😴 Snooze ${s.snoozeMin} min` }],
    priority: 1
  });
}

// ---------------------------------------------------------------- actions

async function handleAction(action) {
  const s = await getSettings();
  chrome.notifications.clear(NOTIF_ID);
  switch (action) {
    case 'done': {
      const count = await addDrinks(1);
      if (s.enabled && !(await isPaused())) await scheduleIn(s.intervalMin, 'interval');
      else await refreshBadge();
      return { count, goal: s.dailyGoal };
    }
    case 'snooze':
      if (s.enabled) await scheduleIn(s.snoozeMin, 'snooze');
      return { snoozeMin: s.snoozeMin };
    case 'dismiss':
    case 'ignored':
    default:
      return {}; // the next interval is already scheduled
  }
}

async function isPaused() {
  const st = await getState();
  return st.pausedUntil > Date.now();
}

async function pause(minutes) {
  const s = await getSettings();
  let until;
  if (minutes === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const start = s.activeHoursEnabled ? parseHM(s.activeStart) : 8 * 60;
    d.setHours(Math.floor(start / 60), start % 60, 0, 0);
    until = d.getTime();
  } else {
    until = Date.now() + Math.max(1, Number(minutes) || 30) * MIN;
  }
  await setState({ pausedUntil: until });
  await scheduleAt(until, 'pause');
  return until;
}

async function resume() {
  const s = await getSettings();
  await setState({ pausedUntil: 0 });
  if (s.enabled) await scheduleIn(s.intervalMin, 'interval');
  else await refreshBadge();
}

async function getStatus() {
  const [settings, state, today, history, alarm] = await Promise.all([
    getSettings(), getState(), getTodayCount(), getHistory(7), chrome.alarms.get(ALARM_REMIND)
  ]);
  return { settings, state, today, history, alarmAt: alarm ? alarm.scheduledTime : null, now: Date.now() };
}

// ---------------------------------------------------------------- sound

const OFFSCREEN_URL = 'src/offscreen/offscreen.html';
let creatingOffscreen = null;

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)]
  });
  if (contexts.length) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play the short reminder sound effects.'
    }).finally(() => { creatingOffscreen = null; });
  }
  await creatingOffscreen;
}

async function playSound(kind) {
  const s = await getSettings();
  if (!s.sound) return;
  try {
    await ensureOffscreen();
    await chrome.runtime.sendMessage({ type: 'drip-offscreen:play', kind });
  } catch {
    /* sound is optional */
  }
}

// ---------------------------------------------------------------- badge

async function refreshBadge() {
  const [s, st] = await Promise.all([getSettings(), getState()]);
  let text = '';
  let color = '#1f7bd8';
  let title = 'Drip – Water Reminder';
  if (!s.enabled) {
    text = 'off'; color = '#8a94a6'; title += ' (off)';
  } else if (st.pausedUntil > Date.now()) {
    text = 'zz'; color = '#8a94a6'; title += ` (paused until ${formatClock(st.pausedUntil)})`;
  } else {
    if (s.showBadge) {
      const c = await getTodayCount();
      text = c > 0 ? String(c) : '';
    }
    if (st.pendingIdle) title += ' (waiting for you to come back)';
    else if (st.nextAt) title += ` – next sip at ${formatClock(st.nextAt)}`;
  }
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
  if (chrome.action.setBadgeTextColor) await chrome.action.setBadgeTextColor({ color: '#ffffff' });
  await chrome.action.setTitle({ title });
}

// ---------------------------------------------------------------- events

chrome.runtime.onInstalled.addListener(async (details) => {
  // Store sanitized settings (keeps user values on update, fills new defaults).
  const { settings } = await chrome.storage.sync.get('settings');
  await chrome.storage.sync.set({ settings: sanitizeSettings(settings) });
  await scheduleMidnight();
  if (details.reason === 'install') {
    const s = await getSettings();
    await scheduleIn(s.intervalMin, 'interval');
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options/options.html?welcome=1') });
  } else {
    await ensureSchedule();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await scheduleMidnight();
  await ensureSchedule();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_REMIND) await onReminderAlarm();
  else if (alarm.name === ALARM_MIDNIGHT) {
    await refreshBadge();
    await scheduleMidnight();
  }
});

chrome.idle.setDetectionInterval(IDLE_SECONDS);
chrome.idle.onStateChanged.addListener(async (idleState) => {
  if (idleState !== 'active') return;
  const [s, st] = await Promise.all([getSettings(), getState()]);
  if (s.enabled && st.pendingIdle) await scheduleIn(1, 'return'); // give a minute to settle in
});

chrome.notifications.onButtonClicked.addListener(async (id, index) => {
  if (id !== NOTIF_ID) return;
  await handleAction(index === 0 ? 'done' : 'snooze');
});
chrome.notifications.onClicked.addListener((id) => {
  if (id === NOTIF_ID) chrome.notifications.clear(id);
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync' || !changes.settings) return;
  const oldS = sanitizeSettings(changes.settings.oldValue);
  const newS = sanitizeSettings(changes.settings.newValue);
  if (oldS.enabled !== newS.enabled) {
    if (newS.enabled) await scheduleIn(newS.intervalMin, 'interval');
    else await clearSchedule();
    return;
  }
  if (newS.enabled && oldS.intervalMin !== newS.intervalMin) {
    const st = await getState();
    if (!(st.pausedUntil > Date.now()) && !st.pendingIdle) await scheduleIn(newS.intervalMin, 'interval');
    return;
  }
  await refreshBadge();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('drip:')) return false;
  (async () => {
    switch (msg.type) {
      case 'drip:action':
        return handleAction(msg.action);
      case 'drip:sound':
        await playSound(String(msg.kind));
        return { ok: true };
      case 'drip:getStatus':
        return getStatus();
      case 'drip:remindNow': {
        const s = await getSettings();
        const where = await showReminder(s, { forceOverlay: true });
        return { where };
      }
      case 'drip:logDrink': {
        const count = await addDrinks(msg.delta === -1 ? -1 : 1);
        if (msg.delta !== -1) {
          const s = await getSettings();
          if (s.enabled && !(await isPaused())) await scheduleIn(s.intervalMin, 'interval');
        }
        await refreshBadge();
        return { count };
      }
      case 'drip:pause':
        return { pausedUntil: await pause(msg.minutes) };
      case 'drip:resume':
        await resume();
        return { ok: true };
      case 'drip:setEnabled':
        await saveSettings({ enabled: !!msg.enabled });
        return { ok: true };
      case 'drip:refreshBadge':
        await refreshBadge();
        return { ok: true };
      default:
        return { error: 'unknown message' };
    }
  })().then(sendResponse, (err) => sendResponse({ error: String(err && err.message || err) }));
  return true; // async response
});
