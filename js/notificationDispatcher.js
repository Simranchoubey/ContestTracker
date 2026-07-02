/**
 * notificationDispatcher.js
 * Sends browser notifications for contests that start in ~1 hour.
 *
 * Runs on a 1-minute polling interval, checks every saved reminder,
 * and fires a notification exactly once per contest per device
 * (duplicate-guard via reminderStorage.wasNotified).
 */

import { getReminders, wasNotified, markNotified, pruneHistory } from './reminderStorage.js';
import { getPermissionStatus } from './notificationPermission.js';

/** Tolerance window around the 1-hour mark (±1 minute) */
const NOTIFY_MS   = 60 * 60 * 1000;      // 1 hour in ms
const TOLERANCE   = 60 * 1000;            // ±1 minute tolerance
const POLL_INTERVAL = 60 * 1000;          // Check every 60 seconds

/** Path to the project logo used as the notification icon */
const ICON_PATH = './favicon.ico';        // Falls back gracefully if absent

let _allContests = [];   // Shared reference to the full contest array
let _timerId     = null; // setInterval handle

/**
 * Starts the polling loop.
 * Call this once, passing the live contests array.
 * The dispatcher keeps a reference so it always works on up-to-date data.
 *
 * @param {Array} contests - The full array of contest objects
 */
export function startNotificationPoller(contests) {
  _allContests = contests;

  // Clear any previous interval (e.g. on page visibility restore)
  if (_timerId) clearInterval(_timerId);

  // Run immediately, then every minute
  _checkAndNotify();
  _timerId = setInterval(_checkAndNotify, POLL_INTERVAL);
}

/**
 * Updates the contests reference when fresh data arrives.
 * @param {Array} contests
 */
export function updateContests(contests) {
  _allContests = contests;
}

/**
 * Stops the polling loop (useful for testing or cleanup).
 */
export function stopNotificationPoller() {
  if (_timerId) {
    clearInterval(_timerId);
    _timerId = null;
  }
}

// ─── Private ─────────────────────────────────────────────────────────────────

/**
 * Core check: iterates over saved reminders and fires a notification
 * for any contest that starts within the 1-hour window.
 */
function _checkAndNotify() {
  // Only proceed if permission is granted
  if (getPermissionStatus() !== 'granted') return;

  const reminders = getReminders();
  if (reminders.size === 0) return;

  const now = Date.now();

  // Prune stale history entries to keep localStorage tidy
  pruneHistory(_allContests);

  for (const contestId of reminders) {
    // Skip if we already notified for this contest
    if (wasNotified(contestId)) continue;

    // Find the matching contest object
    const contest = _allContests.find(c => String(c.id) === String(contestId));
    if (!contest) continue;

    const startMs = new Date(contest.startTime).getTime();
    const msUntilStart = startMs - now;

    // Fire if the contest starts between 59 and 61 minutes from now
    if (msUntilStart >= NOTIFY_MS - TOLERANCE && msUntilStart <= NOTIFY_MS + TOLERANCE) {
      _fireNotification(contest);
      markNotified(contestId); // Prevent duplicate notification
    }
  }
}

/**
 * Creates and displays a browser Notification for the given contest.
 * @param {{name:string, platform:string, id:string}} contest
 */
function _fireNotification(contest) {
  const platformName = _getPlatformLabel(contest.platform);
  const contestName  = contest.name || `${platformName} Contest`;

  const title = '🚀 Contest Starting Soon';
  const body  = `${contestName} starts in 1 hour.`;

  try {
    const notif = new Notification(title, {
      body,
      icon: ICON_PATH,
      tag : `contest-reminder-${contest.id}`, // Deduplicates at the OS level too
      requireInteraction: false,
    });

    // Clicking the notification opens the contest URL
    notif.onclick = () => {
      if (contest.url) window.open(contest.url, '_blank');
      notif.close();
    };
  } catch (err) {
    // Swallow errors (e.g. notification blocked mid-session)
    console.warn('[ContestTracker] Notification failed:', err);
  }
}

/**
 * Maps an internal platform key to a human-readable label.
 * @param {string} platform
 * @returns {string}
 */
function _getPlatformLabel(platform) {
  const map = {
    leetcode   : 'LeetCode',
    codechef   : 'CodeChef',
    gfg        : 'GeeksforGeeks',
    codeforces : 'Codeforces',
  };
  return map[platform] || platform;
}
