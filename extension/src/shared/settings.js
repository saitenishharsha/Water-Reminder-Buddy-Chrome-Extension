// Shared settings, state and stats helpers.
// Used by the service worker, the popup and the options page (ES module).

export const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  intervalMin: 45,          // minutes between reminders
  snoozeMin: 10,            // minutes for "Snooze"
  animation: 'random',      // 'random' | 'peek' | 'walk'
  corners: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  size: 'medium',           // 'small' | 'medium' | 'large'
  sound: true,
  autoHideSec: 25,          // peek mode: hide if ignored after N seconds
  dailyGoal: 8,             // glasses per day
  glassMl: 250,             // shown in stats only
  activeHoursEnabled: false,
  activeStart: '09:00',
  activeEnd: '18:00',
  activeDays: [0, 1, 2, 3, 4, 5, 6], // 0 = Sunday
  pauseWhenIdle: true,
  systemNotification: true, // use a system notification when Chrome is not focused
  showBadge: true
});

export const LIMITS = Object.freeze({
  intervalMin: [1, 240],
  snoozeMin: [1, 120],
  autoHideSec: [5, 120],
  dailyGoal: [1, 30],
  glassMl: [50, 1000]
});

export const ALL_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const ANIMATIONS = ['random', 'peek', 'walk'];
const SIZES = ['small', 'medium', 'large'];
const HM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function clampInt(value, [min, max], fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Merge stored values over the defaults and repair anything invalid. */
export function sanitizeSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = { ...DEFAULT_SETTINGS };

  for (const key of ['enabled', 'sound', 'activeHoursEnabled', 'pauseWhenIdle', 'systemNotification', 'showBadge']) {
    if (typeof src[key] === 'boolean') out[key] = src[key];
  }
  for (const key of Object.keys(LIMITS)) {
    if (src[key] !== undefined) out[key] = clampInt(src[key], LIMITS[key], DEFAULT_SETTINGS[key]);
  }
  if (ANIMATIONS.includes(src.animation)) out.animation = src.animation;
  if (SIZES.includes(src.size)) out.size = src.size;

  if (Array.isArray(src.corners)) {
    const corners = ALL_CORNERS.filter((c) => src.corners.includes(c));
    out.corners = corners.length ? corners : [...ALL_CORNERS];
  } else {
    out.corners = [...ALL_CORNERS];
  }

  if (typeof src.activeStart === 'string' && HM_RE.test(src.activeStart)) out.activeStart = src.activeStart;
  if (typeof src.activeEnd === 'string' && HM_RE.test(src.activeEnd)) out.activeEnd = src.activeEnd;

  if (Array.isArray(src.activeDays)) {
    const days = [...new Set(src.activeDays.map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
    out.activeDays = days.length ? days : [...DEFAULT_SETTINGS.activeDays];
  } else {
    out.activeDays = [...DEFAULT_SETTINGS.activeDays];
  }
  return out;
}

export async function getSettings() {
  const { settings } = await chrome.storage.sync.get('settings');
  return sanitizeSettings(settings);
}

export async function saveSettings(patch) {
  const current = await getSettings();
  const next = sanitizeSettings({ ...current, ...patch });
  await chrome.storage.sync.set({ settings: next });
  return next;
}

export async function resetSettings() {
  const next = sanitizeSettings({});
  await chrome.storage.sync.set({ settings: next });
  return next;
}

// ---------- runtime state (local only) ----------

export const DEFAULT_STATE = Object.freeze({
  nextAt: null,        // ms timestamp of the next reminder, null if none
  intervalStart: null, // ms timestamp the current countdown started
  nextReason: 'interval', // 'interval' | 'snooze' | 'pause' | 'active-hours' | 'return'
  pausedUntil: 0,      // ms timestamp, 0 = not paused
  pendingIdle: false   // a reminder is waiting for the user to come back
});

export async function getState() {
  const { state } = await chrome.storage.local.get('state');
  return { ...DEFAULT_STATE, ...(state || {}) };
}

export async function setState(patch) {
  const next = { ...(await getState()), ...patch };
  await chrome.storage.local.set({ state: next });
  return next;
}

// ---------- daily stats (local only) ----------

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getStats() {
  const { stats } = await chrome.storage.local.get('stats');
  return stats && typeof stats.days === 'object' ? stats : { days: {} };
}

export async function getTodayCount() {
  const stats = await getStats();
  return stats.days[dayKey()] || 0;
}

/** Add (or remove, with a negative delta) glasses for today. Returns the new count. */
export async function addDrinks(delta) {
  const stats = await getStats();
  const key = dayKey();
  const count = Math.max(0, (stats.days[key] || 0) + delta);
  stats.days[key] = count;
  // keep the newest 60 days
  const keys = Object.keys(stats.days).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - 60))) delete stats.days[old];
  await chrome.storage.local.set({ stats });
  return count;
}

export async function resetToday() {
  const stats = await getStats();
  delete stats.days[dayKey()];
  await chrome.storage.local.set({ stats });
}

/** Last `n` days (oldest first) as [{ key, date, count }]. */
export async function getHistory(n = 7) {
  const stats = await getStats();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    out.push({ key, date: d.getTime(), count: stats.days[key] || 0 });
  }
  return out;
}

// ---------- active hours ----------

export function parseHM(str) {
  const [h, m] = String(str).split(':').map(Number);
  return h * 60 + m;
}

export function isWithinActiveHours(date, s) {
  const day = date.getDay();
  const mins = date.getHours() * 60 + date.getMinutes();
  const start = parseHM(s.activeStart);
  const end = parseHM(s.activeEnd);
  if (start === end) return s.activeDays.includes(day);
  if (start < end) return s.activeDays.includes(day) && mins >= start && mins < end;
  // Overnight window, e.g. 22:00–02:00. The early-morning part belongs to the previous day.
  if (mins >= start) return s.activeDays.includes(day);
  if (mins < end) return s.activeDays.includes((day + 6) % 7);
  return false;
}

/** Next moment (ms) when active hours begin, after `date`. */
export function nextActiveStart(date, s) {
  const start = parseHM(s.activeStart);
  for (let i = 0; i <= 8; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() + i);
    d.setHours(Math.floor(start / 60), start % 60, 0, 0);
    if (d.getTime() > date.getTime() && s.activeDays.includes(d.getDay())) return d.getTime();
  }
  return null;
}

// ---------- formatting ----------

export function formatClock(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
