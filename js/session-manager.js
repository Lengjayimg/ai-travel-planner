/**
 * WAYFIND SECURE SESSION & INACTIVITY MANAGER
 * 
 * Rules:
 * - 5 hours inactivity threshold in authenticated areas
 * - Warning period at 4 hours 55 minutes (5-minute countdown modal)
 * - Real session validation via Supabase auth (refreshSession)
 * - Multi-tab synchronization via localStorage and StorageEvents
 * - Tab visibility and sleep recovery (visibilitychange)
 * - Progress preservation for trip planning and drafts without leaking secrets
 * - Accessible alert dialog with keyboard focus trap and polite live announcements
 * - Configurable test hooks for fast testing (e.g. testFastInactivity)
 */

(function(window) {
  'use strict';

  // Production Defaults (5 hours = 18,000,000 ms; warning at 4h 55m = 17,700,000 ms)
  const DEFAULT_INACTIVITY_MS = 5 * 60 * 60 * 1000;
  const DEFAULT_WARNING_MS = (4 * 60 + 55) * 60 * 1000;
  const THROTTLE_ACTIVITY_MS = 5000; // Throttle storage writes to once every 5 seconds

  // Storage Keys
  const KEY_LAST_ACTIVE = 'wayfind_last_active_time';
  const KEY_SYNC_STATE = 'wayfind_session_sync_state';
  const KEY_EXPIRED_NOTICE = 'wayfind_session_expired_notice';
  const KEY_REDIRECT_AFTER_AUTH = 'wayfind_redirect_after_auth';

  class SessionManager {
    constructor() {
      this.inactivityLimitMs = DEFAULT_INACTIVITY_MS;
      this.warningThresholdMs = DEFAULT_WARNING_MS;
      this.countdownDurationMs = this.inactivityLimitMs - this.warningThresholdMs;

      this.lastActiveTime = Date.now();
      this.lastThrottledWriteTime = 0;
      this.checkIntervalId = null;
      this.isWarningShown = false;
      this.isSigningOut = false;
      this.lastAnnouncedMinute = null;
      this.previouslyFocusedEl = null;
      this.focusTrapCleanup = null;
      this.isTestMode = false;

      this.store = null;
      this.authService = null;

      // Bound event references for cleanup
      this._boundOnActivity = this._onUserActivity.bind(this);
      this._boundOnStorage = this._onStorageEvent.bind(this);
      this._boundOnVisibility = this._onVisibilityChange.bind(this);
      this._boundTick = this._tick.bind(this);
    }

    /**
     * Initialize the session manager with store and authService
     */
    init(store, authService) {
      this.store = store || window.store;
      this.authService = authService || window.authService;

      // Read or seed stored last active time
      const storedTime = parseInt(localStorage.getItem(KEY_LAST_ACTIVE), 10);
      if (storedTime && !isNaN(storedTime) && storedTime <= Date.now()) {
        this.lastActiveTime = storedTime;
      } else {
        this.lastActiveTime = Date.now();
        localStorage.setItem(KEY_LAST_ACTIVE, this.lastActiveTime.toString());
      }

      this._attachEventListeners();
      this._bindModalControls();

      // Check if previous session expired due to inactivity
      this.checkAndDisplayExpiryNotice();

      // Start ticker (runs every 1 second)
      if (this.checkIntervalId) clearInterval(this.checkIntervalId);
      this.checkIntervalId = setInterval(this._boundTick, 1000);

      console.info('WayfindSessionManager initialized. Policy: 5h timeout, 5m warning window.');
    }

    /**
     * Reconfigure timeouts (used for tests and development)
     */
    configure({ inactivityMs, warningMs }) {
      if (typeof inactivityMs === 'number' && inactivityMs > 0) {
        this.inactivityLimitMs = inactivityMs;
      }
      if (typeof warningMs === 'number' && warningMs > 0) {
        this.warningThresholdMs = warningMs;
      }
      this.countdownDurationMs = Math.max(1000, this.inactivityLimitMs - this.warningThresholdMs);
      this.isTestMode = true;
      console.info(`WayfindSessionManager configured: Inactivity = ${this.inactivityLimitMs}ms, Warning at = ${this.warningThresholdMs}ms`);
    }

    /**
     * Convenience helper to test inactivity rapidly
     * @param {number} warningSeconds Seconds until warning appears (default: 5)
     * @param {number} totalSeconds Seconds until session auto-expires (default: 10)
     */
    testFastInactivity(warningSeconds = 5, totalSeconds = 10) {
      const wMs = warningSeconds * 1000;
      const iMs = totalSeconds * 1000;
      this.configure({ inactivityMs: iMs, warningMs: wMs });
      this.lastActiveTime = Date.now();
      localStorage.setItem(KEY_LAST_ACTIVE, this.lastActiveTime.toString());
      console.log(`[TEST MODE ACTIVATED] Warning will trigger in ${warningSeconds}s, auto sign-out in ${totalSeconds}s.`);
    }

    /**
     * Reset configuration back to production defaults (5h / 4h55m)
     */
    resetToDefaults() {
      this.inactivityLimitMs = DEFAULT_INACTIVITY_MS;
      this.warningThresholdMs = DEFAULT_WARNING_MS;
      this.countdownDurationMs = DEFAULT_INACTIVITY_MS - DEFAULT_WARNING_MS;
      this.isTestMode = false;
      this.lastActiveTime = Date.now();
      localStorage.setItem(KEY_LAST_ACTIVE, this.lastActiveTime.toString());
      console.info('WayfindSessionManager reset to production defaults: 5h timeout, 4h55m warning.');
    }

    /**
     * Get diagnostic status
     */
    getStatus() {
      const now = Date.now();
      const elapsedMs = now - this.lastActiveTime;
      const remainingMs = Math.max(0, this.inactivityLimitMs - elapsedMs);
      const user = this.store ? this.store.getState().user : null;
      return {
        isLoggedIn: !!(user && user.isLoggedIn),
        isWarningShown: this.isWarningShown,
        elapsedSeconds: Math.floor(elapsedMs / 1000),
        remainingSeconds: Math.ceil(remainingMs / 1000),
        inactivityLimitSeconds: this.inactivityLimitMs / 1000,
        warningThresholdSeconds: this.warningThresholdMs / 1000,
        isTestMode: this.isTestMode
      };
    }

    /**
     * Fast forward or simulate inactivity for testing
     */
    simulateInactivity(seconds) {
      this.lastActiveTime = Date.now() - (seconds * 1000);
      localStorage.setItem(KEY_LAST_ACTIVE, this.lastActiveTime.toString());
      this._tick();
    }

    /**
     * Check if a route is authenticated/protected
     */
    isProtectedRoute(route) {
      const r = (route || '').replace('#', '').trim();
      return ['dashboard', 'saved-trips', 'profile'].includes(r);
    }

    /**
     * Route protection check. If user is logged out and tries to access a protected view,
     * stores target destination and redirects to landing with sign-in prompt.
     */
    protectRoute(route) {
      const user = this.store ? this.store.getState().user : null;
      const isLoggedIn = !!(user && user.isLoggedIn);

      if (this.isProtectedRoute(route) && !isLoggedIn) {
        sessionStorage.setItem(KEY_REDIRECT_AFTER_AUTH, route);
        window.location.hash = 'landing';
        if (typeof window.openModal === 'function') {
          window.openModal('signInModal');
        }
        return false;
      }
      return true;
    }

    /**
     * Attach global DOM event listeners for meaningful user activity
     */
    _attachEventListeners() {
      const activityEvents = [
        'mousemove',
        'mousedown',
        'keydown',
        'scroll',
        'touchstart',
        'touchmove'
      ];

      activityEvents.forEach(evt => {
        window.addEventListener(evt, this._boundOnActivity, { passive: true });
      });

      // Capture input interactions on forms & itineraries
      document.addEventListener('input', this._boundOnActivity, { passive: true });
      document.addEventListener('change', this._boundOnActivity, { passive: true });

      // Multi-tab synchronization
      window.addEventListener('storage', this._boundOnStorage);

      // Tab visibility & sleep resume
      document.addEventListener('visibilitychange', this._boundOnVisibility);
      window.addEventListener('focus', this._boundOnVisibility);
    }

    /**
     * Bind warning modal button clicks & accessibility handlers
     */
    _bindModalControls() {
      const btnContinue = document.getElementById('btnContinueSession');
      const btnSignOut = document.getElementById('btnSignOutSession');

      if (btnContinue) {
        btnContinue.addEventListener('click', (e) => {
          e.preventDefault();
          this.continueSession();
        });
      }

      if (btnSignOut) {
        btnSignOut.addEventListener('click', (e) => {
          e.preventDefault();
          this.signOutFromModal();
        });
      }
    }

    /**
     * Handler for user activity events
     */
    _onUserActivity(e) {
      // If warning modal is open, user activity does NOT reset the timer automatically!
      // The user must explicitly click "Continue Session" as required.
      if (this.isWarningShown) return;

      const user = this.store ? this.store.getState().user : null;
      if (!user || !user.isLoggedIn) {
        // Guests on public landing page don't have inactivity logouts
        return;
      }

      const now = Date.now();
      // Throttle storage writes
      if (now - this.lastThrottledWriteTime >= THROTTLE_ACTIVITY_MS) {
        this.lastActiveTime = now;
        this.lastThrottledWriteTime = now;
        try {
          localStorage.setItem(KEY_LAST_ACTIVE, now.toString());
        } catch (err) {}
      } else {
        this.lastActiveTime = now;
      }
    }

    /**
     * Multi-tab sync via window storage events
     */
    _onStorageEvent(e) {
      if (!e) return;

      // Another tab recorded user activity
      if (e.key === KEY_LAST_ACTIVE && e.newValue) {
        const remoteTime = parseInt(e.newValue, 10);
        if (!isNaN(remoteTime) && remoteTime > this.lastActiveTime) {
          this.lastActiveTime = remoteTime;
          // If warning was active in this tab, dismiss it since user continued in another tab
          if (this.isWarningShown) {
            this.hideWarningModal();
          }
        }
      }

      // Another tab performed a session transition (sign out / renew / expire)
      if (e.key === KEY_SYNC_STATE && e.newValue) {
        if (e.newValue.startsWith('expired_')) {
          this.handleSessionExpired(true);
        } else if (e.newValue.startsWith('logged_out_')) {
          this.hideWarningModal();
          if (this.store && typeof this.store.setUser === 'function') {
            this.store.setUser(null);
          }
        } else if (e.newValue.startsWith('renewed_')) {
          this.lastActiveTime = Date.now();
          if (this.isWarningShown) {
            this.hideWarningModal();
          }
        }
      }
    }

    /**
     * Tab visibility or window focus handler
     */
    _onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        // Tab brought to foreground: immediately sync latest timestamp
        const storedTime = parseInt(localStorage.getItem(KEY_LAST_ACTIVE), 10);
        if (storedTime && !isNaN(storedTime)) {
          this.lastActiveTime = storedTime;
        }
        this._tick();
      }
    }

    /**
     * Regular heartbeat tick (every 1s)
     */
    _tick() {
      const user = this.store ? this.store.getState().user : null;
      const isLoggedIn = !!(user && user.isLoggedIn);

      // Inactivity policy applies strictly to authenticated sessions
      if (!isLoggedIn) {
        if (this.isWarningShown) {
          this.hideWarningModal();
        }
        return;
      }

      const now = Date.now();
      const elapsed = now - this.lastActiveTime;

      // 1. Session Expiry threshold reached
      if (elapsed >= this.inactivityLimitMs) {
        this.handleSessionExpired();
        return;
      }

      // 2. Warning period reached
      if (elapsed >= this.warningThresholdMs) {
        const remainingMs = Math.max(0, this.inactivityLimitMs - elapsed);
        if (!this.isWarningShown) {
          this.showWarningModal(remainingMs);
        } else {
          this.updateCountdownDisplay(remainingMs);
        }
        return;
      }

      // 3. Active session: if warning was somehow shown, close it
      if (this.isWarningShown) {
        this.hideWarningModal();
      }
    }

    /**
     * Display the warning modal with live countdown and trap keyboard focus
     */
    showWarningModal(remainingMs) {
      const modal = document.getElementById('sessionTimeoutModal');
      if (!modal) return;

      this.isWarningShown = true;
      this.previouslyFocusedEl = document.activeElement;

      this.updateCountdownDisplay(remainingMs);
      modal.classList.add('active');

      // Manage keyboard focus trap
      const btnContinue = document.getElementById('btnContinueSession');
      const btnSignOut = document.getElementById('btnSignOutSession');

      if (btnContinue) {
        setTimeout(() => btnContinue.focus(), 60);
      }

      // Keyboard Trap: Tab cycles between Continue and Sign Out only
      const handleKeydown = (e) => {
        if (e.key === 'Tab') {
          const focusable = [btnContinue, btnSignOut].filter(Boolean);
          if (focusable.length < 2) return;

          if (e.shiftKey) {
            if (document.activeElement === focusable[0]) {
              e.preventDefault();
              focusable[1].focus();
            }
          } else {
            if (document.activeElement === focusable[1]) {
              e.preventDefault();
              focusable[0].focus();
            }
          }
        } else if (e.key === 'Escape') {
          // Do NOT allow accidental dismissal of warning modal without choice
          e.preventDefault();
          e.stopPropagation();
        }
      };

      document.addEventListener('keydown', handleKeydown, true);
      this.focusTrapCleanup = () => {
        document.removeEventListener('keydown', handleKeydown, true);
      };

      // Screen reader announcement on modal appearance
      this._announceToScreenReader('Are you still there? You have been inactive. We will sign you out in 5 minutes for your security.');
    }

    /**
     * Update live countdown timer display (MM:SS)
     */
    updateCountdownDisplay(remainingMs) {
      const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      const timerEl = document.getElementById('sessionCountdownTimer');
      if (timerEl) {
        timerEl.textContent = formatted;
      }

      // Polite Screen-Reader Announcements at key intervals (every minute, 30s, 10s)
      if (mins !== this.lastAnnouncedMinute && secs === 0 && mins > 0) {
        this.lastAnnouncedMinute = mins;
        this._announceToScreenReader(`${mins} minute${mins > 1 ? 's' : ''} remaining before sign out.`);
      } else if (mins === 0 && totalSec === 30) {
        this._announceToScreenReader('30 seconds remaining before sign out.');
      } else if (mins === 0 && totalSec === 10) {
        this._announceToScreenReader('10 seconds remaining before sign out.');
      }
    }

    /**
     * Announce text via aria-live polite region without visual clutter
     */
    _announceToScreenReader(text) {
      const liveRegion = document.getElementById('sessionA11yLive');
      if (liveRegion) {
        liveRegion.textContent = '';
        setTimeout(() => {
          liveRegion.textContent = text;
        }, 50);
      }
    }

    /**
     * Hide the warning modal and restore keyboard focus
     */
    hideWarningModal() {
      const modal = document.getElementById('sessionTimeoutModal');
      if (modal) {
        modal.classList.remove('active');
      }
      this.isWarningShown = false;
      this.lastAnnouncedMinute = null;

      if (this.focusTrapCleanup) {
        this.focusTrapCleanup();
        this.focusTrapCleanup = null;
      }

      if (this.previouslyFocusedEl && typeof this.previouslyFocusedEl.focus === 'function') {
        try {
          this.previouslyFocusedEl.focus();
        } catch (e) {}
        this.previouslyFocusedEl = null;
      }
    }

    /**
     * "Continue Session" action:
     * Verifies or renews session via Supabase. If valid, resets timer.
     * If server token is expired/revoked, ends session securely.
     */
    async continueSession() {
      const btnContinue = document.getElementById('btnContinueSession');
      const originalHTML = btnContinue ? btnContinue.innerHTML : 'Continue Session';

      if (btnContinue) {
        btnContinue.disabled = true;
        btnContinue.innerHTML = `<i class="ph ph-circle-notch icon-sm" style="animation: spin 0.8s linear infinite;" aria-hidden="true"></i> <span>Verifying...</span>`;
      }

      try {
        if (!navigator.onLine) {
          throw new Error('NETWORK_OFFLINE');
        }

        // Call Supabase refreshSession to validate token with server
        let refreshed = false;
        if (this.authService && typeof this.authService.refreshSession === 'function') {
          const res = await this.authService.refreshSession();
          if (res && res.session) {
            refreshed = true;
          }
        } else if (window.supabaseClient) {
          const { data, error } = await window.supabaseClient.auth.refreshSession();
          if (error) throw error;
          if (data && data.session) {
            refreshed = true;
          }
        } else {
          // Fallback if client is uninitialized
          refreshed = true;
        }

        if (refreshed) {
          // Session is valid on the server! Reset timers
          const now = Date.now();
          this.lastActiveTime = now;
          this.lastThrottledWriteTime = now;
          localStorage.setItem(KEY_LAST_ACTIVE, now.toString());
          localStorage.setItem(KEY_SYNC_STATE, 'renewed_' + now);

          this.hideWarningModal();

          if (typeof window.showToast === 'function') {
            window.showToast('Session verified. Welcome back!', 'ph-shield-check');
          }
        } else {
          throw new Error('SESSION_INVALID');
        }
      } catch (err) {
        console.warn('Session verification note:', err.message || err);

        if (err.message === 'NETWORK_OFFLINE' || (!navigator.onLine)) {
          if (typeof window.showToast === 'function') {
            window.showToast('Network offline. Reconnecting...', 'ph-wifi-slash');
          }
          // Do not log out immediately on momentary connectivity drops
          // Allow user to click again when back online
        } else {
          // Token expired or revoked on server
          this.handleSessionExpired(false, 'Your session has expired on the server. Please sign in again.');
        }
      } finally {
        if (btnContinue) {
          btnContinue.disabled = false;
          btnContinue.innerHTML = originalHTML;
        }
      }
    }

    /**
     * "Sign Out" clicked from warning modal
     */
    async signOutFromModal() {
      this.preservePlanningProgress();
      this.hideWarningModal();

      if (this.authService) {
        await this.authService.signOut();
      }

      localStorage.setItem(KEY_SYNC_STATE, 'logged_out_' + Date.now());
      window.location.hash = 'landing';
      if (typeof window.openModal === 'function') {
        window.openModal('signInModal');
      }
    }

    /**
     * Automatically handle session expiry after 5 hours (countdown reach 0:00)
     */
    async handleSessionExpired(isRemoteSync = false, customReason = null) {
      if (this.isSigningOut) return;
      this.isSigningOut = true;

      console.warn('Session expired due to inactivity. Triggering secure teardown and progress preservation.');

      // 1. Preserve unsaved inputs and draft itinerary
      this.preservePlanningProgress();

      // 2. Remember intended route to restore after signing back in
      const currentHash = (window.location.hash || '').replace('#', '').trim() || 'dashboard';
      if (currentHash !== 'landing' && currentHash !== 'generating') {
        sessionStorage.setItem(KEY_REDIRECT_AFTER_AUTH, currentHash);
      }

      // 3. Set expired notice flag for the sign-in modal
      sessionStorage.setItem(KEY_EXPIRED_NOTICE, customReason || 'Your session expired due to inactivity. Please sign in again to continue planning your trip.');

      // 4. Notify other tabs via localStorage sync state
      if (!isRemoteSync) {
        try {
          localStorage.setItem(KEY_SYNC_STATE, 'expired_' + Date.now());
        } catch (e) {}
      }

      // 5. Hide warning modal
      this.hideWarningModal();

      // 6. Sign out via auth provider
      try {
        if (this.authService && typeof this.authService.signOut === 'function') {
          await this.authService.signOut({ silent: true });
        } else if (window.supabaseClient) {
          await window.supabaseClient.auth.signOut();
        }
      } catch (e) {
        console.warn('Auth sign-out on expiry note:', e.message);
      }

      // Reset local store user
      if (this.store && typeof this.store.setUser === 'function') {
        this.store.setUser(null);
      }

      // 7. Route to landing and present Sign In modal with expiry explanation
      window.location.hash = 'landing';
      this.isSigningOut = false;

      setTimeout(() => {
        if (typeof window.openModal === 'function') {
          window.openModal('signInModal');
        }
        this.checkAndDisplayExpiryNotice();
      }, 100);
    }

    /**
     * Preserve form inputs, budget, dates, and active working itinerary draft
     * without storing any secrets or passwords
     */
    preservePlanningProgress() {
      try {
        if (typeof window.saveInputProgress === 'function') {
          window.saveInputProgress();
        }
        if (this.store && typeof this.store.persistCurrentTrip === 'function') {
          this.store.persistCurrentTrip();
        }
      } catch (err) {
        console.warn('Draft progress preservation skipped:', err);
      }
    }

    /**
     * Check if an inactivity expiry notice should be shown in the Sign In modal
     */
    checkAndDisplayExpiryNotice() {
      const noticeText = sessionStorage.getItem(KEY_EXPIRED_NOTICE);
      const noticeBox = document.getElementById('signInNotice');
      const noticeMsg = document.getElementById('signInNoticeText');

      if (noticeText && noticeBox) {
        if (noticeMsg) noticeMsg.textContent = noticeText;
        noticeBox.style.display = 'flex';
      } else if (noticeBox) {
        noticeBox.style.display = 'none';
      }
    }

    /**
     * Clear the expiry notice when user signs in or closes notice
     */
    clearExpiryNotice() {
      sessionStorage.removeItem(KEY_EXPIRED_NOTICE);
      const noticeBox = document.getElementById('signInNotice');
      if (noticeBox) noticeBox.style.display = 'none';
    }

    /**
     * Clean up timers and event listeners
     */
    cleanup() {
      if (this.checkIntervalId) {
        clearInterval(this.checkIntervalId);
        this.checkIntervalId = null;
      }

      const activityEvents = [
        'mousemove',
        'mousedown',
        'keydown',
        'scroll',
        'touchstart',
        'touchmove'
      ];
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, this._boundOnActivity);
      });
      document.removeEventListener('input', this._boundOnActivity);
      document.removeEventListener('change', this._boundOnActivity);
      window.removeEventListener('storage', this._boundOnStorage);
      document.removeEventListener('visibilitychange', this._boundOnVisibility);
      window.removeEventListener('focus', this._boundOnVisibility);

      if (this.focusTrapCleanup) {
        this.focusTrapCleanup();
        this.focusTrapCleanup = null;
      }
    }
  }

  // Mount singleton to window
  window.WayfindSessionManager = new SessionManager();

})(window);
