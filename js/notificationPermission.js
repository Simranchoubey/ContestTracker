/**
 * notificationPermission.js
 * Handles requesting, storing, and querying browser notification permission.
 * Also renders the UI banner when permission is denied.
 */

const PERMISSION_ASKED_KEY = 'notif_permission_asked';

/**
 * Returns true if the browser supports the Notifications API.
 */
export function isNotificationSupported() {
  return 'Notification' in window;
}

/**
 * Returns the current notification permission status.
 * @returns {'granted'|'denied'|'default'|'unsupported'}
 */
export function getPermissionStatus() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Requests notification permission from the browser if not already decided.
 * Marks in localStorage that we've asked so we don't prompt on every visit.
 * @returns {Promise<'granted'|'denied'|'default'>}
 */
export async function requestPermission() {
  if (!isNotificationSupported()) return 'unsupported';

  // If already decided, return immediately
  if (Notification.permission !== 'default') {
    return Notification.permission;
  }

  const result = await Notification.requestPermission();
  // Remember that we asked so we don't pester the user again
  localStorage.setItem(PERMISSION_ASKED_KEY, 'true');
  return result;
}

/**
 * Returns true if we have already asked the user for permission.
 * Used to decide whether to show the "Enable Notifications" prompt on first visit.
 */
export function hasAskedPermission() {
  return localStorage.getItem(PERMISSION_ASKED_KEY) === 'true';
}

/**
 * Shows a friendly inline UI banner when notifications are denied,
 * or a one-time welcome prompt on the first visit.
 * Call this after the DOM is ready.
 */
export function renderPermissionUI() {
  // Remove any existing banners to avoid duplicates
  const existing = document.getElementById('notif-banner');
  if (existing) existing.remove();

  const status = getPermissionStatus();

  if (status === 'unsupported') {
    // Show an info message – nothing the user can do
    _insertBanner(
      'info',
      '🔔 Your browser doesn\'t support desktop notifications.'
    );
    return;
  }

  if (status === 'denied') {
    // Friendly message explaining how to re-enable
    _insertBanner(
      'warning',
      '🔕 Notifications are blocked. To get contest reminders, allow notifications for this site in your browser settings.'
    );
    return;
  }

  if (status === 'default' && !hasAskedPermission()) {
    // First visit – show a one-time prompt banner
    _insertBanner(
      'prompt',
      '🔔 Want contest reminders? Enable browser notifications to get alerted 1 hour before a contest starts.',
      async () => {
        const result = await requestPermission();
        renderPermissionUI(); // Re-render after decision
        return result;
      }
    );
  }
}

/**
 * Inserts a notification banner just below the <header>.
 * @param {'info'|'warning'|'prompt'} type  - Controls the colour/style
 * @param {string}                    message
 * @param {Function|null}             onEnable - Optional callback for "Enable" button
 */
function _insertBanner(type, message, onEnable = null) {
  const banner = document.createElement('div');
  banner.id = 'notif-banner';
  banner.className = `notif-banner notif-banner--${type}`;

  const text = document.createElement('span');
  text.className = 'notif-banner__text';
  text.textContent = message;
  banner.appendChild(text);

  if (onEnable) {
    const btn = document.createElement('button');
    btn.className = 'notif-banner__btn';
    btn.textContent = 'Enable Notifications';
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Requesting…';
      await onEnable();
    });
    banner.appendChild(btn);

    // Dismiss button
    const dismiss = document.createElement('button');
    dismiss.className = 'notif-banner__dismiss';
    dismiss.textContent = '✕';
    dismiss.setAttribute('aria-label', 'Dismiss');
    dismiss.addEventListener('click', () => {
      banner.remove();
      // Mark as asked so we don't re-show on refresh
      localStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    });
    banner.appendChild(dismiss);
  }

  // Insert after <header>
  const header = document.querySelector('header');
  if (header && header.nextSibling) {
    header.parentNode.insertBefore(banner, header.nextSibling);
  } else {
    document.body.prepend(banner);
  }
}
