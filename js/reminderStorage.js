/**
 * reminderStorage.js
 * Thin localStorage wrapper for persisting user-selected contest reminders
 * and the notification history (so we never send the same alert twice).
 */

const REMINDERS_KEY   = 'contest_reminders';      // Set of contest IDs
const NOTIF_HIST_KEY  = 'notification_history';   // Set of "fired" contest IDs

// ─── Reminders ──────────────────────────────────────────────────────────────

/**
 * Returns the full set of saved reminder contest IDs.
 * @returns {Set<string>}
 */
export function getReminders() {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

/**
 * Saves a contest ID to the reminder set.
 * Idempotent – adding the same ID twice is a no-op.
 * @param {string} contestId
 */
export function addReminder(contestId) {
  const reminders = getReminders();
  reminders.add(String(contestId));
  _saveReminders(reminders);
}

/**
 * Removes a contest ID from the reminder set.
 * @param {string} contestId
 */
export function removeReminder(contestId) {
  const reminders = getReminders();
  reminders.delete(String(contestId));
  _saveReminders(reminders);
}

/**
 * Returns true if the given contest has a saved reminder.
 * @param {string} contestId
 * @returns {boolean}
 */
export function hasReminder(contestId) {
  return getReminders().has(String(contestId));
}

/** @private */
function _saveReminders(set) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify([...set]));
}

// ─── Notification history ────────────────────────────────────────────────────

/**
 * Returns the set of contest IDs for which a notification has already fired.
 * @returns {Set<string>}
 */
export function getNotificationHistory() {
  try {
    const raw = localStorage.getItem(NOTIF_HIST_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

/**
 * Marks a contest as notified, preventing duplicate notifications.
 * @param {string} contestId
 */
export function markNotified(contestId) {
  const history = getNotificationHistory();
  history.add(String(contestId));
  localStorage.setItem(NOTIF_HIST_KEY, JSON.stringify([...history]));
}

/**
 * Returns true if a notification has already been sent for this contest.
 * @param {string} contestId
 * @returns {boolean}
 */
export function wasNotified(contestId) {
  return getNotificationHistory().has(String(contestId));
}

/**
 * Prunes stale entries from the notification history so localStorage
 * doesn't grow forever. Removes entries whose contest has already passed.
 * @param {Array<{id:string, startTime:number|string|Date}>} allContests
 */
export function pruneHistory(allContests) {
  const now = Date.now();
  const liveIds = new Set(
    allContests
      .filter(c => new Date(c.startTime).getTime() > now)
      .map(c => String(c.id))
  );

  const history = getNotificationHistory();
  for (const id of history) {
    if (!liveIds.has(id)) history.delete(id);
  }
  localStorage.setItem(NOTIF_HIST_KEY, JSON.stringify([...history]));
}
