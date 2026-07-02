import { fetchCodeforcesContests } from './api.js';
import { generateContestData } from './contestData.js';
import { initCalendar } from './calendar.js';
import { renderContests, updateCountdowns, toggleTheme, attachRemindMeListeners, attachCalendarButtonListeners } from './ui.js';
import { renderPermissionUI, requestPermission, hasAskedPermission } from './notificationPermission.js';
import { startNotificationPoller, updateContests } from './notificationDispatcher.js';

// Initialize the application
async function initApp() {
  // ── Theme ────────────────────────────────────────────────────────────────
  if (localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-theme');
  }

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  themeToggleBtn.addEventListener('click', toggleTheme);

  // ── Notification permission (first-visit prompt) ─────────────────────────
  // On the very first visit the user hasn't been asked yet, so we auto-request.
  // On subsequent visits renderPermissionUI() handles the denied/warning banner.
  if (!hasAskedPermission()) {
    // Small delay so the page renders before the browser dialog appears
    setTimeout(async () => {
      await requestPermission();
      renderPermissionUI();
    }, 1500);
  } else {
    // Show denied/warning banner if applicable
    renderPermissionUI();
  }

  // ── Contest data ─────────────────────────────────────────────────────────
  try {
    // Generate contest data for fixed-schedule platforms (untouched)
    const contestData = generateContestData();
    
    // Fetch Codeforces contests (untouched)
    const codeforcesContests = await fetchCodeforcesContests();
    
    // Combine and sort
    const allContests = [...contestData, ...codeforcesContests];
    allContests.sort((a, b) => a.startTime - b.startTime);
    
    // Render UI
    renderContests(allContests);
    initCalendar(allContests);

    // Attach Remind Me button click handlers (event delegation)
    attachRemindMeListeners();

    // Attach Add to Calendar button click handlers (event delegation)
    attachCalendarButtonListeners();

    // Start the 1-minute notification polling loop
    startNotificationPoller(allContests);
    
    // Countdown update every second
    setInterval(() => updateCountdowns(), 1000);
    
    // Cache for offline access
    localStorage.setItem('contestData', JSON.stringify({
      timestamp: Date.now(),
      contests: allContests
    }));

  } catch (error) {
    console.error('Error initializing app:', error);
    
    // Fall back to cached data
    const cachedData = localStorage.getItem('contestData');
    if (cachedData) {
      const { timestamp, contests } = JSON.parse(cachedData);
      const hoursSinceUpdate = (Date.now() - timestamp) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        renderContests(contests);
        initCalendar(contests);
        attachRemindMeListeners();
        attachCalendarButtonListeners();

        // Start notification poller with cached contests
        startNotificationPoller(contests);
        setInterval(() => updateCountdowns(), 1000);
        
        const upcomingSection = document.querySelector('.upcoming-section h2');
        const cacheNotice = document.createElement('span');
        cacheNotice.textContent = ` (Cached data - ${Math.floor(hoursSinceUpdate)}h old)`;
        cacheNotice.style.fontSize = '0.8rem';
        cacheNotice.style.fontWeight = 'normal';
        cacheNotice.style.color = 'var(--text-secondary)';
        upcomingSection.appendChild(cacheNotice);
      } else {
        showError('Failed to load fresh contest data and cached data is too old.');
      }
    } else {
      showError('Failed to load contest data. Please check your internet connection and try again.');
    }
  }
}

function showError(message) {
  const loadingElements = document.querySelectorAll('.loading');
  loadingElements.forEach(el => {
    el.textContent = message;
    el.style.color = '#ff5555';
  });
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Refresh data when tab becomes visible again (existing logic — untouched)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const lastUpdate = localStorage.getItem('contestData') 
      ? JSON.parse(localStorage.getItem('contestData')).timestamp 
      : 0;
    
    const hoursSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate > 6) {
      initApp();
    }
  }
});
