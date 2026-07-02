// ═══════════════════════════════════════════════════════════════════
// Google Calendar "Add to Calendar" integration
//
// Self-contained module: does not touch fetching/API logic, contest
// data shape, or any existing feature. It only reads the contest
// object that ui.js already builds and turns it into a Google
// Calendar "quick add" link.
// ═══════════════════════════════════════════════════════════════════

// Fallback duration used only when a contest has neither a valid
// `endTime` nor a valid `duration` field (should be rare — kept as a
// safety net per the feature spec).
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

// Google Calendar's default account-level reminder for new events is a
// 30-minute-before popup. The public "render" quick-add URL has no
// documented parameter for overriding reminders, so we can't force one
// programmatically — see the README note in ui.js / the change summary
// for details. We surface the same 30-minute expectation in the event
// description so the user isn't caught by surprise.
const REMINDER_MINUTES_BEFORE = 30;

/**
 * Human-readable platform names, mirrored from ui.js so this module has
 * zero dependency on the rest of the UI layer and can be reused anywhere
 * (e.g. hackathons page) without extra wiring.
 * @param {string} platform Platform identifier (e.g. 'leetcode')
 * @returns {string} Display name
 */
function getPlatformDisplayName(platform) {
  const platforms = {
    leetcode: 'LeetCode',
    codechef: 'CodeChef',
    gfg: 'GeeksforGeeks',
    codeforces: 'Codeforces'
  };
  return platforms[platform] || platform;
}

/**
 * Format a Date into the UTC "YYYYMMDDTHHMMSSZ" form Google Calendar's
 * quick-add URL expects for the `dates` parameter.
 *
 * Using UTC (the trailing "Z") is what makes time zones "just work":
 * a Date object always represents one fixed instant in time, and
 * `toISOString()` renders that instant in UTC. Google Calendar takes
 * that absolute instant and displays it in whatever local time zone
 * the viewer's account is set to — so the event always shows up at the
 * correct local time, regardless of where the contest data was
 * generated or where the user is opening the link from.
 *
 * @param {Date} date Date to format
 * @returns {string} UTC timestamp string, e.g. "20260702T183000Z"
 */
function toGoogleCalendarUTCString(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Work out the contest's end Date, following the priority order the
 * spec calls for: explicit endTime -> derived from duration -> default
 * 2-hour fallback.
 * @param {Date} start Contest start Date
 * @param {Object} contest Contest object
 * @returns {Date} Resolved end Date
 */
function resolveEndTime(start, contest) {
  if (contest.endTime) {
    const end = new Date(contest.endTime);
    if (!isNaN(end.getTime())) return end;
  }

  if (typeof contest.duration === 'number' && !isNaN(contest.duration) && contest.duration > 0) {
    return new Date(start.getTime() + contest.duration);
  }

  return new Date(start.getTime() + DEFAULT_DURATION_MS);
}

/**
 * Build the full Google Calendar "quick add" URL for a contest.
 * @param {Object} contest Contest object ({ id, name, platform, url, startTime, endTime, duration })
 * @returns {string} Fully-formed Google Calendar event-creation URL
 */
export function buildGoogleCalendarUrl(contest) {
  const start = new Date(contest.startTime);
  const end = resolveEndTime(start, contest);
  const platformName = getPlatformDisplayName(contest.platform);

  const title = `${contest.name} (${platformName})`;

  const details = [
    `Platform: ${platformName}`,
    `Contest link: ${contest.url}`,
    '',
    `Reminder: Google Calendar will notify you ${REMINDER_MINUTES_BEFORE} minutes before ` +
      `this event starts (your account's default event reminder). Adjust it from the event ` +
      `editor if you'd like a different lead time.`
  ].join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toGoogleCalendarUTCString(start)}/${toGoogleCalendarUTCString(end)}`,
    details,
    location: platformName,
    sf: 'true',
    output: 'xml'
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Open Google Calendar in a new tab, pre-filled with the contest's details.
 * @param {Object} contest Contest object
 */
export function addContestToGoogleCalendar(contest) {
  const url = buildGoogleCalendarUrl(contest);
  window.open(url, '_blank', 'noopener,noreferrer');
}
