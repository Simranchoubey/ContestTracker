// UI updates and rendering functions
import { addReminder, hasReminder } from './reminderStorage.js';
import { getPermissionStatus, requestPermission, renderPermissionUI } from './notificationPermission.js';
import { addContestToGoogleCalendar } from './googleCalendar.js';

// Lookup table of contestId -> contest object, kept up to date on every
// render so the "Add to Calendar" click handler (attached once via event
// delegation) can resolve the full contest data for whichever card was
// clicked, without re-querying the DOM or re-fetching anything.
const contestsById = new Map();

/**
 * Render contests in the UI
 * @param {Array} contests Array of contest objects
 */
export function renderContests(contests) {
  // Keep the id -> contest lookup table current for calendar button clicks
  contestsById.clear();
  contests.forEach(contest => contestsById.set(String(contest.id), contest));

  // Filter for upcoming contests
  const now = new Date();
  const upcomingContests = contests.filter(contest => new Date(contest.startTime) > now);
  
  // Sort contests by start time
  upcomingContests.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
  // Render next contest
  const nextContestEl = document.getElementById('next-contest');
  if (upcomingContests.length > 0) {
    const nextContest = upcomingContests[0];
    nextContestEl.innerHTML = createContestCard(nextContest).outerHTML;
  } else {
    nextContestEl.innerHTML = '<div class="no-contests">No upcoming contests found</div>';
  }
  
  // Render upcoming contests (skip the first one as it's shown in next contest)
  const upcomingContestsEl = document.getElementById('upcoming-contests');
  upcomingContestsEl.innerHTML = '';
  
  if (upcomingContests.length <= 1) {
    upcomingContestsEl.innerHTML = '<div class="no-contests">No additional upcoming contests found</div>';
    return;
  }
  
  upcomingContests.slice(1, 7).forEach(contest => {
    const contestCard = createContestCard(contest);
    upcomingContestsEl.appendChild(contestCard);
  });
  
  // Render platform-specific contests
  renderPlatformContests('leetcode', contests);
  renderPlatformContests('codechef', contests);
  renderPlatformContests('gfg', contests);
  renderPlatformContests('codeforces', contests);
}

/**
 * Create a contest card element
 * @param {Object} contest Contest object
 * @returns {HTMLElement} Contest card element
 */
function createContestCard(contest) {
  const card = document.createElement('div');
  card.className = `contest-card ${contest.platform}`;
  card.dataset.contestId = contest.id;
  
  const startTime = new Date(contest.startTime);
  
  card.innerHTML = `
    <div class="contest-header">
      <div class="contest-platform">
        <span></span>${getPlatformName(contest.platform)}
      </div>
      <div class="contest-date">${formatDate(startTime)}</div>
    </div>
    <div class="contest-title">${contest.name}</div>
    <div class="contest-time">${formatTime(startTime)} - ${formatTime(new Date(contest.endTime))}</div>
    <div class="contest-time">Duration: ${contest.durationFormatted}</div>
    <div class="contest-countdown" data-start-time="${startTime.getTime()}">
      Starts in: ${getCountdown(startTime)}
    </div>
    <div class="contest-register">
      <a href="${contest.url}" target="_blank" class="register-btn">Register</a>
      <button
        class="remind-btn${hasReminder(contest.id) ? ' remind-btn--active' : ''}"
        data-contest-id="${contest.id}"
        aria-label="Set reminder for ${contest.name}">
        ${hasReminder(contest.id) ? '✅ Reminder Added' : '🔔 Remind Me'}
      </button>
      <button
        class="calendar-btn"
        data-contest-id="${contest.id}"
        aria-label="Add ${contest.name} to Google Calendar">
        <span class="cal-icon" aria-hidden="true">📅</span> Add to Calendar
      </button>
    </div>
  `;
  
  return card;
}

/**
 * Render contests for a specific platform
 * @param {string} platform Platform identifier
 * @param {Array} contests Array of contest objects
 */
function renderPlatformContests(platform, contests) {
  const now = new Date();
  
  // Filter contests for this platform and upcoming
  const platformContests = contests.filter(
    contest => contest.platform === platform && new Date(contest.startTime) > now
  );
  
  const containerEl = document.getElementById(`${platform}-contests`);
  containerEl.innerHTML = '';
  
  if (platformContests.length === 0) {
    containerEl.innerHTML = '<div class="no-contests">No upcoming contests</div>';
    return;
  }
  
  // Show next 3 contests for this platform
  platformContests.slice(0, 3).forEach(contest => {
    const contestEl = document.createElement('div');
    contestEl.className = 'platform-contest-item';
    contestEl.innerHTML = `
      <div class="platform-contest-date">${formatDate(new Date(contest.startTime))}</div>
      <div class="platform-contest-name">${contest.name}</div>
      <div class="platform-contest-time">${formatTime(new Date(contest.startTime))}</div>
    `;
    containerEl.appendChild(contestEl);
  });
}

/**
 * Update all countdown timers
 */
export function updateCountdowns() {
  const countdowns = document.querySelectorAll('.contest-countdown');
  
  countdowns.forEach(countdown => {
    const startTime = parseInt(countdown.dataset.startTime, 10);
    countdown.textContent = `Starts in: ${getCountdown(new Date(startTime))}`;
    
    // Check if contest has started
    if (Date.now() >= startTime) {
      countdown.textContent = 'Contest started';
      countdown.style.backgroundColor = 'rgba(39, 174, 96, 0.1)';
    }
  });
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme() {
  const isDarkTheme = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
}

/**
 * Get countdown string from now until a specified date
 * @param {Date} date Target date
 * @returns {string} Formatted countdown
 */
function getCountdown(date) {
  const now = new Date();
  const diff = date - now;
  
  if (diff <= 0) {
    return 'Started';
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Format date for display
 * @param {Date} date Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format time for display
 * @param {Date} date Date to format
 * @returns {string} Formatted time
 */
function formatTime(date) {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get platform's display name
 * @param {string} platform Platform identifier
 * @returns {string} Platform display name
 */
function getPlatformName(platform) {
  const platforms = {
    'leetcode': 'LeetCode',
    'codechef': 'CodeChef',
    'gfg': 'GeeksforGeeks',
    'codeforces': 'Codeforces'
  };
  
  return platforms[platform] || platform;
}

/**
 * Attach click handlers to all "🔔 Remind Me" buttons currently in the DOM.
 * Must be called after renderContests() so the buttons exist.
 * Safe to call multiple times – uses event delegation on a static ancestor.
 */
export function attachRemindMeListeners() {
  // Use event delegation on the #app wrapper so a single listener covers
  // all cards including dynamically rendered ones.
  const app = document.getElementById('app');
  if (!app || app._remindMeListenerAttached) return;
  app._remindMeListenerAttached = true;

  app.addEventListener('click', async (event) => {
    const btn = event.target.closest('.remind-btn');
    if (!btn) return;

    const contestId = btn.dataset.contestId;
    if (!contestId) return;

    // If already saved, do nothing (button is already in "added" state)
    if (btn.classList.contains('remind-btn--active')) return;

    // Ensure we have notification permission before saving
    const status = getPermissionStatus();
    if (status === 'default') {
      const result = await requestPermission();
      // Re-render the permission banner to reflect the new status
      renderPermissionUI();
      if (result !== 'granted') return;
    } else if (status === 'denied' || status === 'unsupported') {
      // Show/refresh the denied banner so the user sees the guide
      renderPermissionUI();
      return;
    }

    // Save the reminder
    addReminder(contestId);

    // Update every button with this contest ID (the same contest may appear
    // in both the "Next Contest" and "Upcoming" sections)
    document.querySelectorAll(`.remind-btn[data-contest-id="${contestId}"]`).forEach(b => {
      b.textContent = '✅ Reminder Added';
      b.classList.add('remind-btn--active');
    });
  });
}

/**
 * Attach click handlers to all "📅 Add to Calendar" buttons currently in
 * the DOM. Like attachRemindMeListeners(), this uses a single delegated
 * listener on the #app wrapper so it also covers cards rendered later
 * (e.g. after a data refresh), and is safe to call more than once.
 */
export function attachCalendarButtonListeners() {
  const app = document.getElementById('app');
  if (!app || app._calendarBtnListenerAttached) return;
  app._calendarBtnListenerAttached = true;

  app.addEventListener('click', (event) => {
    const btn = event.target.closest('.calendar-btn');
    if (!btn) return;

    const contestId = btn.dataset.contestId;
    const contest = contestsById.get(String(contestId));
    if (!contest) return;

    addContestToGoogleCalendar(contest);
  });
}