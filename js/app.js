/**
 * WAYFIND - CORE APPLICATION CONTROLLER
 * Handles view switching, dynamic rendering, itinerary customization,
 * budget calculation, QR code rendering, and conversational AI companion.
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // 1. Initialize Theme from store
  const currentTheme = store.getState().theme;
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeLogos(currentTheme);

  // Apply High-Contrast Accessibility Mode if enabled
  if (store.getState().isHighContrast) {
    document.documentElement.classList.add('high-contrast-mode');
    document.documentElement.setAttribute('data-contrast', 'high');
  }

  // 2. Render initial destination inspiration & hero cards
  renderDestinations('all');

  // 3. Bind Global Navigation & Hash Router
  setupNavigation();

  // 4. Setup Quick Planner Form & Full Wizard Form
  setupPlannerForms();

  // 5. Setup Modals & Overlays
  setupModals();

  // 6. Setup Supabase Authentication
  setupAuth();
  if (window.authService) {
    window.authService.init(store);
  }

  // 7. Setup Chatbot Interactivity
  setupChatbot();

  // 8. Render Cartoon Avatars for Settings
  renderCartoonAvatars();

  // 9. Setup Accessibility Menu & Interactions
  setupA11yMenus();

  // 10. Subscribe UI re-renderers to State Changes
  store.subscribe((state) => {
    renderCurrentView(state);
    updateThemeLogos(state.theme);
    updateUserUI(state.user);
    if (typeof updateBudgetUI === 'function') updateBudgetUI();
  });

  // Initial user UI sync
  updateUserUI(store.getState().user);

  // Handle URL hash on boot
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
}

/* ==========================================================================
   NAVIGATION & ROUTER
   ========================================================================== */
function setupNavigation() {
  // Desktop and Mobile navigation links
  document.querySelectorAll('[data-route]').forEach(el => {
    // Brand logos have their dedicated smooth-scroll handler below
    if (el.matches('.brand-logo, .mobile-brand-link')) return;

    el.addEventListener('click', (e) => {
      e.preventDefault();
      const targetRoute = el.getAttribute('data-route');

      // Divert "Get Started" & "Start Planning" buttons to Sign Up for new/unauthenticated users
      if (['headerGetStartedBtn', 'heroStartPlanningBtn', 'bannerStartPlanningBtn'].includes(el.id)) {
        const user = store.getState().user;
        if (!user || !user.isLoggedIn) {
          openModal('signUpModal');
          closeMobileMenu();
          return;
        }
      }

      const currentHash = window.location.hash.replace('#', '') || 'landing';
      if (currentHash === targetRoute) {
        // Already on target view: ensure smoothly scrolled to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.location.hash = targetRoute;
      }

      closeMobileMenu();
    });
  });

  // Dedicated Brand Logo click: Always smoothly scroll to the very top of the page
  document.querySelectorAll('.brand-logo, .mobile-brand-link').forEach(logo => {
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
      if (store.getState().currentView !== 'landing') {
        window.location.hash = 'landing';
        store.setView('landing');
      }
      closeMobileMenu();
    });
  });

  // Mobile menu hamburger toggle
  const mobileToggle = document.getElementById('mobileNavToggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', (e) => {
      e.preventDefault();
      openMobileMenu();
    });
  }

  // Theme toggle buttons (Header & Settings)
  const themeToggleHeader = document.getElementById('themeToggleBtn');
  if (themeToggleHeader) {
    themeToggleHeader.addEventListener('click', () => {
      store.toggleTheme();
    });
  }
}

function openMobileMenu() {
  const profileDropdown = document.getElementById('headerProfileDropdown');
  if (profileDropdown) {
    profileDropdown.classList.remove('open');
    profileDropdown.classList.add('profile-dismissed');
  }
  if (typeof closeAllA11yMenus === 'function') closeAllA11yMenus();

  const drawer = document.getElementById('mobileNavDrawer');
  if (drawer) {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  const drawer = document.getElementById('mobileNavDrawer');
  if (drawer) {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  const navLinks = document.getElementById('navLinks');
  if (navLinks) navLinks.classList.remove('mobile-open');
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '') || 'landing';
  const validViews = ['landing', 'dashboard', 'planner', 'generating', 'itinerary', 'saved-trips', 'profile'];
  
  if (validViews.includes(hash)) {
    store.setView(hash);
  } else if (['features', 'how-it-works', 'destinations'].includes(hash)) {
    // Scroll to section on landing page
    store.setView('landing');
    setTimeout(() => {
      const sectionEl = document.getElementById(hash);
      if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  } else {
    store.setView('landing');
  }
}

function updateThemeLogos(theme) {
  const logoImgs = document.querySelectorAll('.brand-icon-img');
  const logoFile = theme === 'dark' ? 'Logo for Dark Mode.png' : 'Logo for Light Mode.png';
  logoImgs.forEach(img => {
    img.src = logoFile;
  });

  // Sync settings switch if present
  const themeSwitch = document.getElementById('settingsThemeSwitch');
  if (themeSwitch) {
    themeSwitch.checked = (theme === 'dark');
  }

  // Update theme toggle button in header
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.innerHTML = theme === 'dark' 
      ? '<i class="ph ph-sun icon-md" aria-hidden="true"></i>' 
      : '<i class="ph ph-moon icon-md" aria-hidden="true"></i>';
    themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme');
  }
}

/* ==========================================================================
   VIEW RENDERING LOGIC
   ========================================================================== */
function renderCurrentView(state) {
  // Update view containers visibility
  document.querySelectorAll('.view-container').forEach(container => {
    const viewName = container.getAttribute('data-view');
    if (viewName === state.currentView) {
      container.classList.add('active-view');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      container.classList.remove('active-view');
    }
  });

  // Update active state in nav links (Desktop & Mobile Drawer)
  document.querySelectorAll('.nav-link, .mobile-nav-card').forEach(link => {
    const route = link.getAttribute('data-route');
    if (route === state.currentView) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Re-render specific view components
  if (state.currentView === 'itinerary') {
    renderItineraryView(state);
  } else if (state.currentView === 'saved-trips') {
    renderSavedTripsView(state);
  } else if (state.currentView === 'dashboard') {
    renderDashboardView(state);
  }
}

/* ==========================================================================
   ITINERARY VIEW & LIVE TIMELINE RENDERING
   ========================================================================== */
function renderItineraryView(state) {
  const trip = state.currentTrip;
  const daysNav = document.getElementById('itineraryDaysNav');
  const timelineFeed = document.getElementById('itineraryTimelineFeed');
  const budgetPanel = document.getElementById('itineraryBudgetBreakdown');

  if (!daysNav || !timelineFeed) return;

  // Update Trip Title and Date Badges in Header
  const titleEl = document.getElementById('itineraryTripTitle');
  if (titleEl && trip.title) titleEl.textContent = trip.title;
  const datesEl = document.getElementById('itineraryDatesText');
  if (datesEl && trip.dates) {
    datesEl.textContent = `${trip.dates} (${trip.duration || `${trip.days.length} Days`})`;
  }

  // Ensure activeDayIndex is within bounds of current trip days
  if (state.activeDayIndex >= trip.days.length) {
    state.activeDayIndex = 0;
  }

  // 1. Render Days Tab Bar (Always corresponds to trip.days count and dates)
  daysNav.innerHTML = trip.days.map((day, idx) => `
    <button class="day-tab-btn ${idx === state.activeDayIndex ? 'active' : ''}" onclick="selectDayIndex(${idx})" role="tab" aria-selected="${idx === state.activeDayIndex ? 'true' : 'false'}" title="${day.title || ''}">
      Day ${day.dayNumber}: ${day.date.split(',')[0]}
    </button>
  `).join('');

  // 2. Render Activities Timeline for Active Day
  const activeDay = trip.days[state.activeDayIndex] || trip.days[0];
  const dayTitleEl = document.getElementById('itineraryActiveDayTitle');
  if (dayTitleEl && activeDay) {
    dayTitleEl.textContent = `Day ${activeDay.dayNumber} — ${activeDay.title}`;
  }

  if (activeDay.activities.length === 0) {
    timelineFeed.innerHTML = `
      <div class="card-solid" style="padding: 40px; text-align: center;">
        <p style="color: var(--color-text-muted); margin-bottom: 16px;">No activities scheduled for this day yet.</p>
        <button class="btn btn-secondary btn-sm" onclick="openAddActivityModal()">+ Add An Activity</button>
      </div>
    `;
  } else {
    timelineFeed.innerHTML = activeDay.activities.map(act => {
      const displayCost = formatCurrency(act.costUSD || Math.round((act.costNGN || 5000) / 850), state.currency);

      return `
        <div class="timeline-activity-card animate-fade-in" id="${act.id}">
          <div class="activity-img-wrapper">
            <img src="${act.image}" alt="${act.title}" loading="lazy" />
          </div>
          <div class="activity-main-info">
            <div class="activity-meta-row">
              <span class="activity-time"><i class="ph ph-clock icon-sm" aria-hidden="true"></i> ${act.time}</span>
              <span><i class="ph ph-map-pin icon-sm" aria-hidden="true"></i> ${act.location}</span>
              ${act.aiBadge ? `<span class="badge badge-ai"><i class="ph ph-sparkle" aria-hidden="true"></i> ${act.aiBadge}</span>` : ''}
            </div>
            <h4 style="font-size: 1.15rem; margin: 4px 0;">${act.title}</h4>
            <p style="font-size: 0.9rem; margin: 0;">${act.notes}</p>
          </div>
          <div class="activity-actions-col">
            <span class="activity-cost-badge">${displayCost}</span>
            <div style="display: flex; gap: 8px;">
              <button class="activity-icon-btn" title="Swap with AI alternative" onclick="swapActivityAction('${act.id}')"><i class="ph ph-arrows-clockwise" aria-hidden="true"></i> Swap</button>
              <button class="activity-icon-btn btn-delete" title="Remove activity" aria-label="Remove activity" onclick="deleteActivityAction('${act.id}')"><i class="ph ph-trash" aria-hidden="true"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 3. Render Budget Breakdown in Sidebar
  if (budgetPanel) {
    const totalCostStr = formatCurrency(trip.budgetTotalUSD, state.currency);

    budgetPanel.innerHTML = `
      <div class="budget-total-header">
        <p>Estimated Total (${trip.duration})</p>
        <h3>${totalCostStr}</h3>
        <div style="margin-top: 10px; display: flex; align-items: center; gap: 8px;">
          <label style="font-size: 0.78rem; color: var(--color-text-muted);">Currency:</label>
          <select class="form-control" style="font-size: 0.78rem; padding: 4px 8px; height: 30px; width: auto; font-weight: 600;" onchange="store.setCurrency(this.value)">
            ${Object.values(WAYFIND_CURRENCIES).map(c => `
              <option value="${c.code}" ${state.currency === c.code ? 'selected' : ''}>${c.code} (${c.symbol})</option>
            `).join('')}
          </select>
        </div>
      </div>
      <div class="budget-category-list">
        ${trip.budgetBreakdown.map(cat => {
          const catAmount = formatCurrency(cat.allocatedUSD, state.currency);
          return `
            <div class="budget-cat-item">
              <div class="budget-cat-top">
                <span><strong>${cat.category}</strong></span>
                <span>${catAmount} (${cat.percent}%)</span>
              </div>
              <div class="budget-cat-bar-bg">
                <div class="budget-cat-bar-fill" style="width: ${cat.percent}%; background-color: ${cat.color};"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-border); font-size: 0.82rem; color: var(--color-text-muted);">
        <i class="ph ph-lightbulb" style="color: var(--color-primary); font-size: 1.15rem; vertical-align: middle;" aria-hidden="true"></i> <strong>AI Cost Intelligence:</strong> Estimates include verified boutique lodging, ground transfers in Abuja, entry permits, and dining allocations.
      </div>
    `;
  }
}

function selectDayIndex(idx) {
  store.setDayIndex(idx);
  // Auto-scroll the active tab into view horizontally in the swipeable days bar
  setTimeout(() => {
    const daysNav = document.getElementById('itineraryDaysNav');
    if (daysNav) {
      const activeBtn = daysNav.querySelectorAll('.day-tab-btn')[idx];
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, 40);
}

function deleteActivityAction(activityId) {
  const state = store.getState();
  store.deleteActivity(state.activeDayIndex, activityId);
  showToast("Activity removed from schedule", "ph-trash");
}

function swapActivityAction(activityId) {
  const state = store.getState();
  store.swapActivity(state.activeDayIndex, activityId);
  showToast("AI suggested alternative applied!", "ph-sparkle");
}

/* ==========================================================================
   DASHBOARD & SAVED TRIPS VIEWS
   ========================================================================== */
function renderDashboardView(state) {
  const activeTrip = state.currentTrip;
  const coverEl = document.getElementById('dashActiveCover');
  const titleEl = document.getElementById('dashActiveTitle');
  const datesEl = document.getElementById('dashActiveDates');
  const datesValEl = document.getElementById('dashActiveDatesVal');

  if (coverEl) coverEl.src = activeTrip.coverImage;
  if (titleEl) titleEl.textContent = activeTrip.title;
  if (datesValEl) {
    datesValEl.textContent = `${activeTrip.destination} • ${activeTrip.dates}`;
  } else if (datesEl) {
    datesEl.innerHTML = `<i class="ph ph-calendar-blank"></i> <span id="dashActiveDatesVal">${activeTrip.destination} • ${activeTrip.dates}</span> <i class="ph ph-pencil-simple icon-xs"></i>`;
  }
}

function renderSavedTripsView(state) {
  const container = document.getElementById('savedTripsGrid');
  if (!container) return;

  container.innerHTML = state.savedTrips.map(trip => `
    <div class="saved-trip-card animate-fade-in">
      <div class="saved-trip-cover">
        <img src="${trip.coverImage}" alt="${trip.title}" loading="lazy" />
        <span class="destination-badge">${trip.status}</span>
      </div>
      <div class="saved-trip-body">
        <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-primary); text-transform: uppercase;">
          ${trip.destination}
        </span>
        <h3 style="font-size: 1.25rem;">${trip.title}</h3>
        <p style="font-size: 0.88rem; color: var(--color-text-muted);">${trip.dates} • ${trip.travelers}</p>
        <div style="margin-top: auto; padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-family: var(--font-display); font-weight: 700; color: var(--color-text-headline);">
            ${formatCurrency(trip.budgetTotalUSD, state.currency)}
          </span>
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash = 'itinerary'">Open Plan</button>
        </div>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   DESTINATION INSPIRATION FILTER
   ========================================================================== */
function renderDestinations(filter) {
  const grid = document.getElementById('destinationsGrid');
  if (!grid) return;

  const dests = WAYFIND_DATA.destinations;
  const filtered = filter === 'all' ? dests : dests.filter(d => d.id === filter);

  grid.innerHTML = filtered.map(d => `
    <div class="destination-card animate-fade-in">
      <div class="destination-img-box">
        <img src="${d.image}" alt="${d.name}" loading="lazy" />
        <span class="destination-badge">${d.badge}</span>
      </div>
      <div class="destination-body">
        <div class="destination-title">
          <h3>${d.name}</h3>
          <span class="destination-country">${d.country}</span>
        </div>
        <p class="destination-tagline">${d.tagline}</p>
        <div class="destination-highlights-list">
          ${d.highlights.slice(0, 3).map(h => `<span class="destination-tag"><i class="ph ph-check icon-xs" style="color: var(--color-primary);" aria-hidden="true"></i> ${h}</span>`).join('')}
        </div>
        <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.85rem; color: var(--color-text-muted);">From <strong>${formatDestinationBudget(d.avgBudgetPerDay, store.getState().currency)}</strong>/day</span>
          <button class="btn btn-secondary btn-sm" onclick="startPlanningDestination('${d.name}')">Plan Trip</button>
        </div>
      </div>
    </div>
  `).join('');

  // Update filter pill UI
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
  });
}

function startPlanningDestination(destName) {
  const inputEl = document.getElementById('quickFormDestination');
  if (inputEl) inputEl.value = destName;
  window.location.hash = 'planner';
}

/* ==========================================================================
   PLANNER FORMS & SIMULATED AI GENERATION
   ========================================================================== */

// --- Integrated Advance Calendar State ---
let calViewYear = 2026;
let calViewMonth = 10; // 0-indexed: 10 = November 2026
let wizardStartDate = null; // Date object or null
let wizardEndDate = null; // Date object or null

// --- Target Budget & Currency State ---
let wizardBudgetValue = null; // number or null
let isWizardBudgetUnlimited = false;

const CAL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const CAL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CAL_SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatCalendarDisplayDate(date) {
  if (!date) return '';
  const dayName = CAL_DAY_NAMES[date.getDay()];
  const monthName = CAL_SHORT_MONTHS[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${dayName}, ${monthName} ${day}, ${year}`;
}

function formatShortInputDate(date) {
  if (!date) return '';
  const month = CAL_SHORT_MONTHS[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

function renderWizardCalendar() {
  const monthHeading = document.getElementById('calMonthHeading');
  const daysGrid = document.getElementById('calDaysGrid');
  if (!daysGrid || !monthHeading) return;

  monthHeading.textContent = `${CAL_MONTH_NAMES[calViewMonth]} ${calViewYear}`;
  daysGrid.innerHTML = '';

  const firstDayIndex = new Date(calViewYear, calViewMonth, 1).getDay();
  const totalDays = new Date(calViewYear, calViewMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fill in leading empty day slots
  for (let i = 0; i < firstDayIndex; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-day-cell is-disabled';
    daysGrid.appendChild(blank);
  }

  // Populate days of month
  for (let day = 1; day <= totalDays; day++) {
    const cellDate = new Date(calViewYear, calViewMonth, day);
    cellDate.setHours(0, 0, 0, 0);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day-cell';
    btn.textContent = day;

    if (cellDate.getTime() === today.getTime()) {
      btn.classList.add('is-today');
    }

    const isStart = wizardStartDate && cellDate.getTime() === wizardStartDate.getTime();
    const isEnd = wizardEndDate && cellDate.getTime() === wizardEndDate.getTime();
    const inRange = wizardStartDate && wizardEndDate &&
      cellDate.getTime() > wizardStartDate.getTime() &&
      cellDate.getTime() < wizardEndDate.getTime();

    if (isStart) {
      btn.classList.add('start-selected');
      if (wizardEndDate) btn.classList.add('has-end');
    }
    if (isEnd) {
      btn.classList.add('end-selected');
      if (wizardStartDate) btn.classList.add('has-start');
    }
    if (inRange) {
      btn.classList.add('in-range');
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handleWizardCalendarClick(cellDate);
    });

    daysGrid.appendChild(btn);
  }
}

function handleWizardCalendarClick(clickedDate) {
  // If neither start is selected, or both were already selected: start fresh
  if (!wizardStartDate || (wizardStartDate && wizardEndDate)) {
    wizardStartDate = clickedDate;
    wizardEndDate = null;
  } else if (wizardStartDate && !wizardEndDate) {
    if (clickedDate.getTime() >= wizardStartDate.getTime()) {
      wizardEndDate = clickedDate;
    } else {
      // Clicked earlier date: make it the new start date
      wizardStartDate = clickedDate;
      wizardEndDate = null;
    }
  }

  updateWizardDatesDisplay();
  renderWizardCalendar();
}

function updateWizardDatesDisplay() {
  const startInput = document.getElementById('wizardStartDate');
  const endInput = document.getElementById('wizardEndDate');
  const statusContainer = document.getElementById('wizardDatesStatus');

  if (startInput) startInput.value = formatShortInputDate(wizardStartDate);
  if (endInput) endInput.value = formatShortInputDate(wizardEndDate);

  if (!statusContainer) return;

  if (wizardStartDate && wizardEndDate) {
    const diffMs = wizardEndDate.getTime() - wizardStartDate.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const nights = Math.max(1, days - 1);

    statusContainer.innerHTML = `
      <div class="dates-status-active animate-fade-in">
        <div class="date-status-pill">
          <span class="date-status-tag"><i class="ph ph-airplane-takeoff"></i> Start date:</span>
          <strong class="date-status-val">${formatCalendarDisplayDate(wizardStartDate)}</strong>
        </div>
        <div class="date-status-arrow">
          <i class="ph ph-arrow-right"></i>
        </div>
        <div class="date-status-pill">
          <span class="date-status-tag"><i class="ph ph-airplane-landing"></i> End date:</span>
          <strong class="date-status-val">${formatCalendarDisplayDate(wizardEndDate)}</strong>
        </div>
        <span class="date-status-duration">
          <i class="ph ph-clock"></i> ${days} ${days === 1 ? 'Day' : 'Days'} / ${nights} ${nights === 1 ? 'Night' : 'Nights'}
        </span>
      </div>
    `;
  } else if (wizardStartDate) {
    statusContainer.innerHTML = `
      <div class="dates-status-active animate-fade-in" onclick="openDateOverlay('planner')" style="cursor: pointer;" title="Click to choose End date">
        <div class="date-status-pill">
          <span class="date-status-tag"><i class="ph ph-airplane-takeoff"></i> Start date:</span>
          <strong class="date-status-val">${formatCalendarDisplayDate(wizardStartDate)}</strong>
        </div>
        <span style="font-size: 0.85rem; color: var(--color-primary-dark); font-weight: 600;">
          Next: Click to choose an End date
        </span>
      </div>
    `;
  } else {
    statusContainer.innerHTML = `
      <div class="dates-status-empty" onclick="openDateOverlay('planner')" style="cursor: pointer;" title="Click to select dates">
        <i class="ph ph-calendar-check icon-sm" aria-hidden="true"></i>
        <span>No travel dates selected yet. Click here or on the fields above to choose your Start date and End date in advance.</span>
      </div>
    `;
  }
}

function wizardCalendarQuickSelect(preset) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  if (preset === 'thisWeekend') {
    const dayOfWeek = base.getDay();
    const daysToSat = (6 - dayOfWeek + 7) % 7 || 7;
    const sat = new Date(base.getFullYear(), base.getMonth(), base.getDate() + daysToSat);
    const sun = new Date(base.getFullYear(), base.getMonth(), base.getDate() + daysToSat + 1);
    wizardStartDate = sat;
    wizardEndDate = sun;
    calViewMonth = sat.getMonth();
    calViewYear = sat.getFullYear();
  } else if (preset === 'nextWeek') {
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 7);
    const end = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 13);
    wizardStartDate = start;
    wizardEndDate = end;
    calViewMonth = start.getMonth();
    calViewYear = start.getFullYear();
  } else if (preset === 'inOneMonth') {
    const start = new Date(base.getFullYear(), base.getMonth() + 1, 10);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 15);
    wizardStartDate = start;
    wizardEndDate = end;
    calViewMonth = start.getMonth();
    calViewYear = start.getFullYear();
  }

  updateWizardDatesDisplay();
  renderWizardCalendar();
}

function wizardCalendarClear() {
  wizardStartDate = null;
  wizardEndDate = null;
  updateWizardDatesDisplay();
  renderWizardCalendar();
}

/* ==========================================================================
   UNIVERSAL DATES OVERLAY POP OUT CONTROLLER (All Views)
   ========================================================================== */
let activeDateOverlayCaller = 'planner'; // 'landing' | 'planner' | 'itinerary' | 'dashboard'
let overlayStartDate = null;
let overlayEndDate = null;
let overlayCalViewYear = 2026;
let overlayCalViewMonth = 10; // November 2026 (0-indexed)

function openDateOverlay(caller = 'planner') {
  activeDateOverlayCaller = caller;

  if (caller === 'planner') {
    overlayStartDate = wizardStartDate ? new Date(wizardStartDate.getTime()) : null;
    overlayEndDate = wizardEndDate ? new Date(wizardEndDate.getTime()) : null;
    if (overlayStartDate) {
      overlayCalViewMonth = overlayStartDate.getMonth();
      overlayCalViewYear = overlayStartDate.getFullYear();
    } else {
      overlayCalViewMonth = calViewMonth;
      overlayCalViewYear = calViewYear;
    }
  } else if (caller === 'landing') {
    if (wizardStartDate && wizardEndDate) {
      overlayStartDate = new Date(wizardStartDate.getTime());
      overlayEndDate = new Date(wizardEndDate.getTime());
      overlayCalViewMonth = overlayStartDate.getMonth();
      overlayCalViewYear = overlayStartDate.getFullYear();
    } else {
      overlayStartDate = new Date(2026, 10, 12);
      overlayEndDate = new Date(2026, 10, 15);
      overlayCalViewMonth = 10;
      overlayCalViewYear = 2026;
    }
  } else if (caller === 'itinerary' || caller === 'dashboard') {
    if (wizardStartDate && wizardEndDate) {
      overlayStartDate = new Date(wizardStartDate.getTime());
      overlayEndDate = new Date(wizardEndDate.getTime());
      overlayCalViewMonth = overlayStartDate.getMonth();
      overlayCalViewYear = overlayStartDate.getFullYear();
    } else {
      overlayStartDate = new Date(2026, 10, 12);
      overlayEndDate = new Date(2026, 10, 15);
      overlayCalViewMonth = 10;
      overlayCalViewYear = 2026;
    }
  }

  updateOverlayDatesDisplay();
  renderOverlayCalendar();
  openModal('datesOverlayModal');
}

function closeDateOverlay() {
  const modal = document.getElementById('datesOverlayModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function renderOverlayCalendar() {
  const monthHeading = document.getElementById('overlayMonthHeading');
  const daysGrid = document.getElementById('overlayDaysGrid');
  if (!daysGrid || !monthHeading) return;

  monthHeading.textContent = `${CAL_MONTH_NAMES[overlayCalViewMonth]} ${overlayCalViewYear}`;
  daysGrid.innerHTML = '';

  const firstDayIndex = new Date(overlayCalViewYear, overlayCalViewMonth, 1).getDay();
  const totalDays = new Date(overlayCalViewYear, overlayCalViewMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fill in leading empty day slots
  for (let i = 0; i < firstDayIndex; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-day-cell is-disabled';
    daysGrid.appendChild(blank);
  }

  // Populate days of month
  for (let day = 1; day <= totalDays; day++) {
    const cellDate = new Date(overlayCalViewYear, overlayCalViewMonth, day);
    cellDate.setHours(0, 0, 0, 0);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day-cell';
    btn.textContent = day;

    if (cellDate.getTime() === today.getTime()) {
      btn.classList.add('is-today');
    }

    const isStart = overlayStartDate && cellDate.getTime() === overlayStartDate.getTime();
    const isEnd = overlayEndDate && cellDate.getTime() === overlayEndDate.getTime();
    const inRange = overlayStartDate && overlayEndDate &&
      cellDate.getTime() > overlayStartDate.getTime() &&
      cellDate.getTime() < overlayEndDate.getTime();

    if (isStart) {
      btn.classList.add('start-selected');
      if (overlayEndDate) btn.classList.add('has-end');
    }
    if (isEnd) {
      btn.classList.add('end-selected');
      if (overlayStartDate) btn.classList.add('has-start');
    }
    if (inRange) {
      btn.classList.add('in-range');
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handleOverlayCalClick(cellDate);
    });

    daysGrid.appendChild(btn);
  }
}

function handleOverlayCalClick(clickedDate) {
  if (!overlayStartDate || (overlayStartDate && overlayEndDate)) {
    overlayStartDate = clickedDate;
    overlayEndDate = null;
  } else if (overlayStartDate && !overlayEndDate) {
    if (clickedDate.getTime() >= overlayStartDate.getTime()) {
      overlayEndDate = clickedDate;
    } else {
      overlayStartDate = clickedDate;
      overlayEndDate = null;
    }
  }

  updateOverlayDatesDisplay();
  renderOverlayCalendar();
}

function updateOverlayDatesDisplay() {
  const startBoxVal = document.getElementById('overlayStartDateText');
  const endBoxVal = document.getElementById('overlayEndDateText');
  const statusContainer = document.getElementById('datesOverlayStatus');

  if (startBoxVal) {
    startBoxVal.textContent = overlayStartDate ? formatShortInputDate(overlayStartDate) : 'Select start date';
    startBoxVal.style.color = overlayStartDate ? 'var(--color-primary-dark)' : 'var(--color-text-muted)';
  }
  if (endBoxVal) {
    endBoxVal.textContent = overlayEndDate ? formatShortInputDate(overlayEndDate) : 'Select end date';
    endBoxVal.style.color = overlayEndDate ? 'var(--color-primary-dark)' : 'var(--color-text-muted)';
  }

  if (!statusContainer) return;

  if (overlayStartDate && overlayEndDate) {
    const diffMs = overlayEndDate.getTime() - overlayStartDate.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const nights = Math.max(1, days - 1);

    statusContainer.innerHTML = `
      <div class="dates-status-active animate-fade-in">
        <div class="date-status-pill">
          <span class="date-status-tag"><i class="ph ph-airplane-takeoff"></i> Start date:</span>
          <strong class="date-status-val">${formatCalendarDisplayDate(overlayStartDate)}</strong>
        </div>
        <div class="date-status-arrow">
          <i class="ph ph-arrow-right"></i>
        </div>
        <div class="date-status-pill">
          <span class="date-status-tag"><i class="ph ph-airplane-landing"></i> End date:</span>
          <strong class="date-status-val">${formatCalendarDisplayDate(overlayEndDate)}</strong>
        </div>
        <span class="date-status-duration">
          <i class="ph ph-clock"></i> ${days} ${days === 1 ? 'Day' : 'Days'} / ${nights} ${nights === 1 ? 'Night' : 'Nights'}
        </span>
      </div>
    `;
  } else if (overlayStartDate) {
    statusContainer.innerHTML = `
      <div class="dates-status-active animate-fade-in">
        <div class="date-status-pill">
          <span class="date-status-tag"><i class="ph ph-airplane-takeoff"></i> Start date:</span>
          <strong class="date-status-val">${formatCalendarDisplayDate(overlayStartDate)}</strong>
        </div>
        <span style="font-size: 0.85rem; color: var(--color-primary-dark); font-weight: 600;">
          Next: Click an End date on the calendar below
        </span>
      </div>
    `;
  } else {
    statusContainer.innerHTML = `
      <div class="dates-status-empty">
        <i class="ph ph-calendar-check icon-sm" aria-hidden="true"></i>
        <span>Click on the calendar below: 1st click sets Start date, 2nd click sets End date.</span>
      </div>
    `;
  }
}

function overlayCalendarQuickSelect(preset) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  if (preset === 'thisWeekend') {
    const dayOfWeek = base.getDay();
    const daysToSat = (6 - dayOfWeek + 7) % 7 || 7;
    const sat = new Date(base.getFullYear(), base.getMonth(), base.getDate() + daysToSat);
    const sun = new Date(base.getFullYear(), base.getMonth(), base.getDate() + daysToSat + 1);
    overlayStartDate = sat;
    overlayEndDate = sun;
    overlayCalViewMonth = sat.getMonth();
    overlayCalViewYear = sat.getFullYear();
  } else if (preset === 'nextWeek') {
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 7);
    const end = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 13);
    overlayStartDate = start;
    overlayEndDate = end;
    overlayCalViewMonth = start.getMonth();
    overlayCalViewYear = start.getFullYear();
  } else if (preset === 'inOneMonth') {
    const start = new Date(base.getFullYear(), base.getMonth() + 1, 10);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 15);
    overlayStartDate = start;
    overlayEndDate = end;
    overlayCalViewMonth = start.getMonth();
    overlayCalViewYear = start.getFullYear();
  }

  updateOverlayDatesDisplay();
  renderOverlayCalendar();
}

function overlayCalendarClear() {
  overlayStartDate = null;
  overlayEndDate = null;
  updateOverlayDatesDisplay();
  renderOverlayCalendar();
}

// --- Curated Day & Activity Templates Pool for Dynamic Itineraries ---
const CURATED_DAY_TEMPLATES = [
  {
    dayTheme: "Arrival, Lakeside Unwind & Sunset",
    activities: [
      {
        id: "act-t1-1",
        time: "10:30 AM",
        title: "Arrive at Nnamdi Azikiwe Airport (ABV)",
        location: "Airport Road, Abuja",
        category: "Transport",
        costNGN: 18000,
        costUSD: 22,
        duration: "1h 15m",
        notes: "Private pre-booked airport transfer to hotel via express highway.",
        image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80",
        aiBadge: "Optimized Route"
      },
      {
        id: "act-t1-2",
        time: "12:00 PM",
        title: "Check-in at Fraser Suites / Wells Carlton",
        location: "Central Area / Asokoro, Abuja",
        category: "Stay",
        costNGN: 48000,
        costUSD: 58,
        duration: "1h 30m",
        notes: "Freshen up, enjoy terrace welcome drinks overlooking the city skyline.",
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t1-3",
        time: "1:45 PM",
        title: "Welcome Lunch at Nkoyo or Jollof Bistro",
        location: "Bathurst Street, Kado / Wuse 2",
        category: "Food",
        costNGN: 16000,
        costUSD: 20,
        duration: "1h 15m",
        notes: "Authentic Nigerian delicacies: charcoal-grilled tilapia, fragrant party jollof, and freshly squeezed Chapman.",
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
        aiBadge: "Local Culinary Favorite"
      },
      {
        id: "act-t1-4",
        time: "4:00 PM",
        title: "Kayaking & Sunset at Jabi Lake Boat Club",
        location: "Alex Ekwueme Way, Jabi, Abuja",
        category: "Activity",
        costNGN: 12000,
        costUSD: 15,
        duration: "2h 30m",
        notes: "Rent tandem kayaks, take scenic waterfront photography, and enjoy fresh breeze as the sun dips over the lake.",
        image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
        aiBadge: "Weather-Adaptive Timing"
      },
      {
        id: "act-t1-5",
        time: "7:30 PM",
        title: "Starlight Dinner at Cilantro / Wuse Dining",
        location: "Maitama Amusement Park Grounds",
        category: "Food",
        costNGN: 22000,
        costUSD: 26,
        duration: "2h",
        notes: "Relaxed open-air garden seating under soft fairy lights with fusion grills and mocktails.",
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
      }
    ]
  },
  {
    dayTheme: "Artisan Galleries, Craft Village & Botanical Stroll",
    activities: [
      {
        id: "act-t2-1",
        time: "9:00 AM",
        title: "Artisan Breakfast at The Pavillion",
        location: "Wuse 2, Abuja",
        category: "Food",
        costNGN: 10000,
        costUSD: 12,
        duration: "1h",
        notes: "Sourdough toast, tropical fruit bowls, and rich African single-origin coffee.",
        image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t2-2",
        time: "10:30 AM",
        title: "Thought Pyramid Art Centre & Nike Art Gallery Abuja",
        location: "Libreville Street, Wuse 2",
        category: "Culture",
        costNGN: 6000,
        costUSD: 7,
        duration: "2h",
        notes: "Explore avant-garde African installations, modern oil paintings, and wood carvings.",
        image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80",
        aiBadge: "Curated Art Collection"
      },
      {
        id: "act-t2-3",
        time: "1:00 PM",
        title: "Abuja Arts & Crafts Village",
        location: "Central Business District (CBD)",
        category: "Culture",
        costNGN: 15000,
        costUSD: 18,
        duration: "1h 30m",
        notes: "Meet local leather artisans, bead makers, and bronze sculptors. Perfect for handmade souvenirs.",
        image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t2-4",
        time: "3:30 PM",
        title: "Mindful Stroll through Millennium Park",
        location: "Maitama District, Abuja",
        category: "Nature",
        costNGN: 4000,
        costUSD: 5,
        duration: "2h",
        notes: "Designed by Italian architect Manfredi Nicoletti; expansive fountains, indigenous flora, and view of Aso Rock.",
        image: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=600&q=80",
        aiBadge: "Peaceful & Shaded"
      },
      {
        id: "act-t2-5",
        time: "7:00 PM",
        title: "Social Evening at Bature Brewery",
        location: "Adetokunbo Ademola Crescent, Wuse 2",
        category: "Nightlife",
        costNGN: 18000,
        costUSD: 21,
        duration: "2h 30m",
        notes: "West Africa's pioneering craft micro-brewery; live indie acoustic session and artisanal woodfired pizzas.",
        image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80"
      }
    ]
  },
  {
    dayTheme: "Day Excursion: Gurara Waterfalls & Zuma Monolith",
    activities: [
      {
        id: "act-t3-1",
        time: "8:00 AM",
        title: "Scenic Countryside Drive to Gurara Falls",
        location: "Suleja – Minna Road, Niger State",
        category: "Transport",
        costNGN: 25000,
        costUSD: 30,
        duration: "1h 30m",
        notes: "Private air-conditioned SUV transfer through picturesque savannah hills.",
        image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
        aiBadge: "Best Early Morning Lighting"
      },
      {
        id: "act-t3-2",
        time: "10:00 AM",
        title: "Guided Gorge Walk & Waterfall Photography",
        location: "Gurara Nature Reserve",
        category: "Nature",
        costNGN: 8000,
        costUSD: 10,
        duration: "2h 30m",
        notes: "Walk along the roaring freshwater cascades and tranquil rock pools with certified nature guides.",
        image: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=600&q=80",
        aiBadge: "Top Nature Highlight"
      },
      {
        id: "act-t3-3",
        time: "1:00 PM",
        title: "Riverbank Gourmet Picnic",
        location: "Gurara Shaded Pavilions",
        category: "Food",
        costNGN: 14000,
        costUSD: 17,
        duration: "1h 30m",
        notes: "Packed artisan lunch: grilled chicken skewers, plantain chips, jollof parcels, and chilled zobo tea.",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t3-4",
        time: "3:30 PM",
        title: "Zuma Rock Viewpoint & Cultural Photo Stop",
        location: "Abuja-Kaduna Highway",
        category: "Sightseeing",
        costNGN: 3000,
        costUSD: 4,
        duration: "1h",
        notes: "Stand before Nigeria's majestic 725m natural monolith with iconic human face contours in the rock face.",
        image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t3-5",
        time: "7:30 PM",
        title: "Dinner & Rooftop Views at The Vue",
        location: "Novare Central, Wuse Zone 5",
        category: "Food",
        costNGN: 24000,
        costUSD: 28,
        duration: "2h",
        notes: "Upscale pan-Asian rooftop dining overlooking the night lights of the capital city.",
        image: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=600&q=80"
      }
    ]
  },
  {
    dayTheme: "Architectural Wonders, Monolith Overlooks & Sunset Tea",
    activities: [
      {
        id: "act-t4-1",
        time: "9:00 AM",
        title: "Breakfast & Fresh Pastries at Charcoal Grill",
        location: "Aminu Kano Crescent, Wuse 2",
        category: "Food",
        costNGN: 11000,
        costUSD: 13,
        duration: "1h",
        notes: "Artisanal croissants, avocado toast, and freshly pressed tropical juice.",
        image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t4-2",
        time: "10:30 AM",
        title: "National Mosque & Christian Centre Architectural Tour",
        location: "Independence Avenue, Central District",
        category: "Culture",
        costNGN: 5000,
        costUSD: 6,
        duration: "2h",
        notes: "Guided exploration of Abuja's iconic monumental architecture with golden domes and stained glass.",
        image: "https://images.unsplash.com/photo-1548625361-16dd80a562cf?auto=format&fit=crop&w=600&q=80",
        aiBadge: "Architectural Landmark"
      },
      {
        id: "act-t4-3",
        time: "1:15 PM",
        title: "Traditional Lunch at Yellow Chili Bistro",
        location: "Gana Street, Maitama",
        category: "Food",
        costNGN: 17000,
        costUSD: 20,
        duration: "1h 30m",
        notes: "Savor seafood okra, slow-braised goat meat pepper soup, and pounded yam.",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t4-4",
        time: "3:45 PM",
        title: "Aso Rock Panorama & Presidential Hillside Overlook",
        location: "Asokoro Overlook, Abuja",
        category: "Sightseeing",
        costNGN: 4000,
        costUSD: 5,
        duration: "1h 30m",
        notes: "Spectacular vantage point overlooking the presidential complex and the 400m granite monolith.",
        image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t4-5",
        time: "7:00 PM",
        title: "Live Afro-Jazz & Dinner at Dunes Center",
        location: "Aguiyi Ironsi Way, Maitama",
        category: "Nightlife",
        costNGN: 26000,
        costUSD: 31,
        duration: "2h 30m",
        notes: "Upscale dining terrace with curated wine selection and live acoustic saxophone.",
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
      }
    ]
  },
  {
    dayTheme: "Nature Reserves, Eco-Canopy & Farm Retreat",
    activities: [
      {
        id: "act-t5-1",
        time: "8:30 AM",
        title: "Morning Eco-Walk at National Park & Zoo",
        location: "Three Arms Zone, Asokoro",
        category: "Nature",
        costNGN: 6000,
        costUSD: 7,
        duration: "2h",
        notes: "Tranquil trail with giraffes, zebras, and indigenous birds at the foot of Aso Rock.",
        image: "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t5-2",
        time: "11:00 AM",
        title: "Abuja Botanical Gardens & Tropical Orchid Trail",
        location: "Maitama Extension",
        category: "Nature",
        costNGN: 4000,
        costUSD: 5,
        duration: "1h 30m",
        notes: "Shaded canopy pathways and rare West African flora photography.",
        image: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t5-3",
        time: "1:30 PM",
        title: "Farm-to-Table Lunch at Bwari Organic Retreat",
        location: "Bwari Hills Scenic Valley",
        category: "Food",
        costNGN: 15000,
        costUSD: 18,
        duration: "2h",
        notes: "Organic salad platters, wood-roasted chicken, and fresh passion fruit smoothies.",
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t5-4",
        time: "4:00 PM",
        title: "Traditional Ushafa Pottery Village Workshop",
        location: "Ushafa Pottery Center, Bwari",
        category: "Culture",
        costNGN: 7000,
        costUSD: 8,
        duration: "2h",
        notes: "Hands-on pottery throwing session with master matriarch artisans who hosted Queen Elizabeth II in 1991.",
        image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80",
        aiBadge: "Heritage Handcraft"
      },
      {
        id: "act-t5-5",
        time: "7:30 PM",
        title: "Terrace Dinner at Sky Bar Rooftop",
        location: "Summerset Continental Hotel, Maitama",
        category: "Food",
        costNGN: 23000,
        costUSD: 27,
        duration: "2h",
        notes: "Panoramic city night lights, signature mocktails, and Mediterranean grills.",
        image: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=600&q=80"
      }
    ]
  },
  {
    dayTheme: "Culinary Tasting, Bazaars & Sunset Wellness",
    activities: [
      {
        id: "act-t6-1",
        time: "9:30 AM",
        title: "Artisan Pastries & Espresso at Café de Vie",
        location: "Adetokunbo Ademola, Wuse 2",
        category: "Food",
        costNGN: 9000,
        costUSD: 11,
        duration: "1h",
        notes: "Handmade pain au chocolat, cappuccino, and fruit bowls in a serene courtyard.",
        image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t6-2",
        time: "11:00 AM",
        title: "Wuse Market Spice & Textile Guided Tour",
        location: "Wuse Zone 5, Abuja",
        category: "Culture",
        costNGN: 12000,
        costUSD: 14,
        duration: "2h",
        notes: "Experience the vibrant heartbeat of the city: Ankara prints, dried habaneros, and handmade baskets.",
        image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t6-3",
        time: "1:30 PM",
        title: "Gourmet Suya & Street Food Tasting Experience",
        location: "Yahuza Suya Spot, Wuse 2",
        category: "Food",
        costNGN: 11000,
        costUSD: 13,
        duration: "1h 30m",
        notes: "Authentic wood-smoked beef suya, masa cakes, and cold freshly brewed hibiscus zobo.",
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
        aiBadge: "Signature Street Flavors"
      },
      {
        id: "act-t6-4",
        time: "3:30 PM",
        title: "Luxury Hammam & Wellness Spa Session",
        location: "Wells Carlton Hotel Spa, Asokoro",
        category: "Wellness",
        costNGN: 28000,
        costUSD: 33,
        duration: "2h",
        notes: "Rejuvenating Moroccan hammam body scrub, steam bath, and tension-relief massage.",
        image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t6-5",
        time: "7:00 PM",
        title: "Candlelit Fusion Dinner at BluCabana",
        location: "Shehu Yar'adua Way, Mabushi",
        category: "Food",
        costNGN: 25000,
        costUSD: 29,
        duration: "2h 30m",
        notes: "Poolside cabana dining with woodfired flatbreads, grilled salmon, and acoustic jazz.",
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
      }
    ]
  },
  {
    dayTheme: "Usman Dam Reservoir Walk & Farewell Departure",
    activities: [
      {
        id: "act-t7-1",
        time: "8:30 AM",
        title: "Morning Fresh Air Walk at Usman Dam",
        location: "Bwari Road, Ushafa",
        category: "Nature",
        costNGN: 5000,
        costUSD: 6,
        duration: "2h",
        notes: "Panoramic mountain-framed reservoir offering calm reflective waters and peaceful morning breeze.",
        image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80",
        aiBadge: "Gentle Morning Pace"
      },
      {
        id: "act-t7-2",
        time: "11:30 AM",
        title: "Brunch & Specialty Coffee at Salamander Café",
        location: "Bujumbura Street, Wuse 2",
        category: "Food",
        costNGN: 12000,
        costUSD: 14,
        duration: "1h 30m",
        notes: "Popular literary cafe and garden with fresh waffles, eggs benedict, and literary magazine browsing.",
        image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "act-t7-3",
        time: "1:30 PM",
        title: "Hotel Check-out & Airport Express Transfer",
        location: "Central Area to Nnamdi Azikiwe Airport (ABV)",
        category: "Transport",
        costNGN: 18000,
        costUSD: 22,
        duration: "1h 15m",
        notes: "Comfortable air-conditioned ride to ABV airport with flight check-in reminders in the app.",
        image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80"
      }
    ]
  }
];

function generateTripDaysForCount(daysCount, startDate) {
  const generatedDays = [];
  const baseDate = startDate ? new Date(startDate.getTime()) : new Date(2026, 10, 12);
  const middleTemplates = CURATED_DAY_TEMPLATES.slice(1, 6);

  for (let i = 0; i < daysCount; i++) {
    const dayNumber = i + 1;
    const dayDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dayName = CAL_DAY_NAMES[dayDate.getDay()];
    const monthShort = CAL_SHORT_MONTHS[dayDate.getMonth()];
    const dayFormatted = `${dayName}, ${monthShort} ${dayDate.getDate()}`;

    let template;
    if (daysCount === 1) {
      template = {
        dayTheme: "Abuja City Highlights & Departure",
        activities: [
          {
            id: `act-d${dayNumber}-1`,
            time: "9:00 AM",
            title: "Arrive in Abuja & Welcome Transfer",
            location: "Nnamdi Azikiwe Airport to Central District",
            category: "Transport",
            costNGN: 18000,
            costUSD: 22,
            duration: "1h 30m",
            notes: "Private pre-booked transfer into the city centre with luggage storage.",
            image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80",
            aiBadge: "Express Route"
          },
          {
            id: `act-d${dayNumber}-2`,
            time: "11:00 AM",
            title: "Thought Pyramid & Arts Village Tour",
            location: "Wuse 2 & CBD",
            category: "Culture",
            costNGN: 10000,
            costUSD: 12,
            duration: "2h",
            notes: "Quick immersion into contemporary African art and handcrafted souvenirs.",
            image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80"
          },
          {
            id: `act-d${dayNumber}-3`,
            time: "1:30 PM",
            title: "Authentic Welcome Lunch at Nkoyo",
            location: "Kado District",
            category: "Food",
            costNGN: 16000,
            costUSD: 20,
            duration: "1h 30m",
            notes: "Delight in smoky party jollof, grilled tilapia, and Chapman.",
            image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80"
          },
          {
            id: `act-d${dayNumber}-4`,
            time: "3:30 PM",
            title: "Kayaking & Sunset at Jabi Lake",
            location: "Jabi Lake Park",
            category: "Activity",
            costNGN: 12000,
            costUSD: 15,
            duration: "2h",
            notes: "Waterfront breeze and skyline photography as the sun dips.",
            image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80"
          },
          {
            id: `act-d${dayNumber}-5`,
            time: "6:30 PM",
            title: "Airport Express Transfer & Evening Flight",
            location: "Nnamdi Azikiwe Airport (ABV)",
            category: "Transport",
            costNGN: 18000,
            costUSD: 22,
            duration: "1h 15m",
            notes: "Seamless private transfer back to the terminal with mobile boarding assistance.",
            image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80"
          }
        ]
      };
    } else if (i === 0) {
      template = CURATED_DAY_TEMPLATES[0];
    } else if (i === daysCount - 1) {
      template = CURATED_DAY_TEMPLATES[CURATED_DAY_TEMPLATES.length - 1];
    } else {
      const midIdx = (i - 1) % middleTemplates.length;
      template = middleTemplates[midIdx];
    }

    const activitiesClone = template.activities.map((act, actIdx) => ({
      ...act,
      id: `act-d${dayNumber}-${actIdx + 1}`
    }));

    generatedDays.push({
      dayNumber: dayNumber,
      title: template.dayTheme,
      date: dayFormatted,
      activities: activitiesClone
    });
  }

  return generatedDays;
}

function synchronizeTripDaysForDateRange(startDate, endDate) {
  if (!startDate) return;
  const validStart = new Date(startDate.getTime());
  const validEnd = endDate ? new Date(endDate.getTime()) : new Date(startDate.getTime());

  if (validEnd.getTime() < validStart.getTime()) {
    validEnd.setTime(validStart.getTime());
  }

  const diffMs = validEnd.getTime() - validStart.getTime();
  const daysCount = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
  const nightsCount = Math.max(1, daysCount - 1);
  const formattedRange = `${formatShortInputDate(validStart)} - ${formatShortInputDate(validEnd)}`;
  const durationStr = `${daysCount} ${daysCount === 1 ? 'Day' : 'Days'} / ${nightsCount} ${nightsCount === 1 ? 'Night' : 'Nights'}`;

  const state = store.getState();
  const trip = state.currentTrip;
  if (!trip) return;

  trip.dates = formattedRange;
  trip.duration = durationStr;

  // Always generate/adapt trip.days to match the EXACT number of selected days
  trip.days = generateTripDaysForCount(daysCount, validStart);

  // Keep activeDayIndex within bounds
  if (state.activeDayIndex >= daysCount) {
    state.activeDayIndex = 0;
  }

  // Recalculate trip budget for new days
  store.recalculateBudget();

  // Dynamically allocate budget categories based on the recalculated budget
  const totalUSD = trip.budgetTotalUSD || (daysCount * 90);
  const totalNGN = trip.budgetTotalNGN || (totalUSD * 850);
  trip.budgetBreakdown = [
    { category: "Accommodation", allocatedNGN: Math.round(totalNGN * 0.46), allocatedUSD: Math.round(totalUSD * 0.46), color: "#3B4A20", percent: 46 },
    { category: "Dining & Food", allocatedNGN: Math.round(totalNGN * 0.24), allocatedUSD: Math.round(totalUSD * 0.24), color: "#5A7E64", percent: 24 },
    { category: "Transport & Transit", allocatedNGN: Math.round(totalNGN * 0.16), allocatedUSD: Math.round(totalUSD * 0.16), color: "#8DB48E", percent: 16 },
    { category: "Activities & Culture", allocatedNGN: Math.round(totalNGN * 0.14), allocatedUSD: Math.round(totalUSD * 0.14), color: "#D87D4A", percent: 14 }
  ];

  // Update header text in itinerary view
  const datesEl = document.getElementById('itineraryDatesText');
  if (datesEl) {
    datesEl.textContent = `${formattedRange} (${durationStr})`;
  }

  const dashDatesVal = document.getElementById('dashActiveDatesVal');
  if (dashDatesVal) {
    dashDatesVal.textContent = `${trip.destination || 'Abuja, Nigeria'} • ${formattedRange}`;
  }

  // Re-render itinerary view if currently on itinerary
  if (state.currentView === 'itinerary') {
    renderItineraryView(state);
  }
}

function applyDateOverlay() {
  if (!overlayStartDate) {
    if (typeof showToast === 'function') {
      showToast('Please select at least a Start Date on the calendar.', 'ph-calendar');
    }
    return;
  }

  if (!overlayEndDate) {
    overlayEndDate = new Date(overlayStartDate.getTime());
  }

  const diffMs = overlayEndDate.getTime() - overlayStartDate.getTime();
  const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
  const formattedRange = `${formatShortInputDate(overlayStartDate)} - ${formatShortInputDate(overlayEndDate)}`;

  // 1. Sync to Planner Wizard state
  wizardStartDate = new Date(overlayStartDate.getTime());
  wizardEndDate = new Date(overlayEndDate.getTime());
  calViewMonth = overlayCalViewMonth;
  calViewYear = overlayCalViewYear;
  updateWizardDatesDisplay();

  // 2. Sync to Landing Quick Planner
  const quickInput = document.getElementById('quickFormDates');
  if (quickInput) {
    quickInput.value = formattedRange;
  }

  // 3. Synchronize Trip Days and Dates so sticky swipeable days exactly match selection
  synchronizeTripDaysForDateRange(overlayStartDate, overlayEndDate);

  if (typeof showToast === 'function') {
    showToast(`Travel dates applied: ${formattedRange} (${days} ${days === 1 ? 'Day' : 'Days'})`, 'ph-calendar-check');
  }

  closeDateOverlay();
}

// --- Target Budget & Multi-Currency Engine ---
function getCurrencyConfig(code) {
  const active = code || store.getState().currency || 'USD';
  const cfg = (window.WAYFIND_CURRENCIES && window.WAYFIND_CURRENCIES[active]) || { code: 'USD', symbol: '$', rate: 1.0 };
  let step = 50;
  let max = 10000;
  let mid = 5000;

  if (cfg.rate >= 1000) {
    step = 50000;
    max = 15000000;
    mid = 7500000;
  } else if (cfg.rate >= 100) {
    step = 5000;
    max = 1500000;
    mid = 750000;
  } else if (cfg.rate >= 10) {
    step = 500;
    max = 150000;
    mid = 75000;
  }

  return { ...cfg, step, max, mid };
}

function updateBudgetUI(opts = {}) {
  const currencyCode = store.getState().currency || 'USD';
  const cfg = getCurrencyConfig(currencyCode);

  const currencySelect = document.getElementById('wizardCurrencySelect');
  const currencyPrefix = document.getElementById('budgetCurrencyPrefix');
  const budgetInput = document.getElementById('wizardBudgetInput');
  const budgetSlider = document.getElementById('wizardBudgetSlider');
  const budgetDisplay = document.getElementById('wizardBudgetVal');
  const scaleMin = document.getElementById('budgetScaleMin');
  const scaleMid = document.getElementById('budgetScaleMid');
  const scaleMax = document.getElementById('budgetScaleMax');
  const btnUnlimited = document.getElementById('btnUnlimitedBudget');

  if (currencySelect && currencySelect.value !== currencyCode) {
    currencySelect.value = currencyCode;
  }
  if (currencyPrefix) currencyPrefix.textContent = cfg.symbol;

  if (scaleMin) scaleMin.textContent = `${cfg.symbol}0`;
  if (scaleMid) scaleMid.textContent = `${cfg.symbol}${cfg.mid.toLocaleString()}`;
  if (scaleMax) scaleMax.textContent = `${cfg.symbol}${cfg.max.toLocaleString()}+`;

  if (isWizardBudgetUnlimited) {
    if (btnUnlimited) btnUnlimited.classList.add('active');
    if (budgetDisplay) budgetDisplay.innerHTML = `<i class="ph ph-infinity" style="margin-right: 4px;"></i> Unlimited Budget`;
    if (budgetInput) {
      budgetInput.value = '';
      budgetInput.placeholder = 'Unlimited';
    }
    if (budgetSlider) {
      budgetSlider.max = cfg.max;
      budgetSlider.value = cfg.max;
    }
    return;
  } else {
    if (btnUnlimited) btnUnlimited.classList.remove('active');
  }

  if (wizardBudgetValue === null || wizardBudgetValue === undefined) {
    if (budgetDisplay) budgetDisplay.textContent = 'Select or enter budget';
    if (budgetInput) {
      budgetInput.value = '';
      budgetInput.placeholder = `e.g. ${(cfg.rate >= 1000 ? 500000 : 500).toLocaleString()}`;
    }
    if (budgetSlider) {
      budgetSlider.max = cfg.max;
      budgetSlider.step = cfg.step;
      budgetSlider.value = 0;
    }
    return;
  }

  const numVal = Math.max(0, wizardBudgetValue);

  // Dynamic unlimited slider max
  if (budgetSlider) {
    const targetMax = Math.max(cfg.max, Math.ceil((numVal * 1.35) / cfg.step) * cfg.step);
    budgetSlider.max = targetMax;
    budgetSlider.step = cfg.step;
    budgetSlider.value = numVal;
  }

  if (budgetInput && !opts.skipInput) {
    budgetInput.value = numVal;
    budgetInput.placeholder = '0';
  }

  if (budgetDisplay) {
    budgetDisplay.textContent = `${cfg.symbol}${numVal.toLocaleString()}`;
  }
}

function handleBudgetStep(direction) {
  const currencyCode = store.getState().currency || 'USD';
  const cfg = getCurrencyConfig(currencyCode);
  isWizardBudgetUnlimited = false;

  if (wizardBudgetValue === null || wizardBudgetValue === undefined || isNaN(wizardBudgetValue)) {
    wizardBudgetValue = direction > 0 ? cfg.step : 0;
  } else {
    wizardBudgetValue = Math.max(0, wizardBudgetValue + (direction * cfg.step));
  }

  updateBudgetUI();
}

function handleBudgetManualInput(val) {
  isWizardBudgetUnlimited = false;
  if (val === '' || val === null || isNaN(val)) {
    wizardBudgetValue = null;
  } else {
    wizardBudgetValue = Math.max(0, parseInt(val, 10) || 0);
  }
  updateBudgetUI({ skipInput: true });
}

function handleBudgetSliderInput(val) {
  isWizardBudgetUnlimited = false;
  wizardBudgetValue = Math.max(0, parseInt(val, 10) || 0);
  updateBudgetUI();
}

function toggleUnlimitedBudget() {
  isWizardBudgetUnlimited = !isWizardBudgetUnlimited;
  if (isWizardBudgetUnlimited) {
    wizardBudgetValue = null;
  } else {
    const cfg = getCurrencyConfig(store.getState().currency);
    wizardBudgetValue = cfg.mid;
  }
  updateBudgetUI();
}

function handleWizardCurrencyChange(newCurrency) {
  const oldCurrency = store.getState().currency || 'USD';
  if (oldCurrency === newCurrency) return;

  const oldRate = window.WAYFIND_CURRENCIES[oldCurrency]?.rate || 1.0;
  const newRate = window.WAYFIND_CURRENCIES[newCurrency]?.rate || 1.0;

  if (wizardBudgetValue !== null && !isWizardBudgetUnlimited) {
    const usdEquivalent = wizardBudgetValue / oldRate;
    wizardBudgetValue = Math.round(usdEquivalent * newRate);
  }

  store.setCurrency(newCurrency);
  updateBudgetUI();
}

function setupPlannerForms() {
  // 1. Landing Quick Planner Form
  const quickForm = document.getElementById('quickTripForm');
  if (quickForm) {
    quickForm.addEventListener('submit', (e) => {
      e.preventDefault();
      triggerAIGeneration();
    });
  }

  // 2. Full Wizard Form
  const wizardForm = document.getElementById('fullPlannerForm');
  if (wizardForm) {
    wizardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!wizardStartDate || !wizardEndDate) {
        if (typeof showToast === 'function') {
          showToast('Please select your travel dates in advance.', 'ph-calendar');
        }
        openDateOverlay('planner');
        return;
      }
      triggerAIGeneration();
    });
  }

  // 3. Calendar Navigation & Input Bindings
  const prevBtn = document.getElementById('calPrevMonthBtn');
  const nextBtn = document.getElementById('calNextMonthBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      calViewMonth--;
      if (calViewMonth < 0) {
        calViewMonth = 11;
        calViewYear--;
      }
      renderWizardCalendar();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      calViewMonth++;
      if (calViewMonth > 11) {
        calViewMonth = 0;
        calViewYear++;
      }
      renderWizardCalendar();
    });
  }

  // Overlay Calendar Navigation
  const overlayPrev = document.getElementById('overlayPrevMonthBtn');
  const overlayNext = document.getElementById('overlayNextMonthBtn');
  if (overlayPrev) {
    overlayPrev.addEventListener('click', () => {
      overlayCalViewMonth--;
      if (overlayCalViewMonth < 0) {
        overlayCalViewMonth = 11;
        overlayCalViewYear--;
      }
      renderOverlayCalendar();
    });
  }
  if (overlayNext) {
    overlayNext.addEventListener('click', () => {
      overlayCalViewMonth++;
      if (overlayCalViewMonth > 11) {
        overlayCalViewMonth = 0;
        overlayCalViewYear++;
      }
      renderOverlayCalendar();
    });
  }

  const startInput = document.getElementById('wizardStartDate');
  const endInput = document.getElementById('wizardEndDate');
  [startInput, endInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('click', () => {
        openDateOverlay('planner');
      });
    }
  });

  // 4. Budget Controls: Stepper Arrows, Manual Input, Slider & Unlimited Pill
  const stepUpBtn = document.getElementById('budgetStepUp');
  const stepDownBtn = document.getElementById('budgetStepDown');
  if (stepUpBtn) {
    stepUpBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleBudgetStep(1);
    });
  }
  if (stepDownBtn) {
    stepDownBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleBudgetStep(-1);
    });
  }

  const budgetInput = document.getElementById('wizardBudgetInput');
  if (budgetInput) {
    budgetInput.addEventListener('input', (e) => {
      handleBudgetManualInput(e.target.value);
    });
    budgetInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleBudgetStep(1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleBudgetStep(-1);
      }
    });
  }

  const budgetSlider = document.getElementById('wizardBudgetSlider');
  if (budgetSlider) {
    budgetSlider.addEventListener('input', (e) => {
      handleBudgetSliderInput(e.target.value);
    });
  }

  const unlimitedBtn = document.getElementById('btnUnlimitedBudget');
  if (unlimitedBtn) {
    unlimitedBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleUnlimitedBudget();
    });
  }

  const currencySelect = document.getElementById('wizardCurrencySelect');
  if (currencySelect) {
    currencySelect.addEventListener('change', (e) => {
      handleWizardCurrencyChange(e.target.value);
    });
  }

  // 5. Choice Chip Toggles (Companions & Interests)
  document.querySelectorAll('.choice-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const parent = chip.parentElement;
      if (parent.classList.contains('single-select')) {
        const wasActive = chip.classList.contains('active');
        parent.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
        if (!wasActive) chip.classList.add('active');
      } else {
        chip.classList.toggle('active');
      }
    });
  });

  // Initial render of calendar & budget
  renderWizardCalendar();
  updateWizardDatesDisplay();
  updateBudgetUI();
}

function triggerAIGeneration() {
  // Determine start & end dates from planner wizard or fallback
  const startDate = wizardStartDate || new Date(2026, 10, 12);
  const endDate = wizardEndDate || new Date(2026, 10, 15);

  // Synchronize trip days and dates so sticky swipeable days correspond to the exact date range
  synchronizeTripDaysForDateRange(startDate, endDate);

  const diffMs = endDate.getTime() - startDate.getTime();
  const daysCount = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

  // Navigate to 'generating' state
  store.setView('generating');
  
  const steps = [
    { text: "Analyzing travel preferences and companion needs...", delay: 600 },
    { text: "Optimizing scenic routes across Abuja & Niger State...", delay: 1300 },
    { text: "Balancing curated dining, admission fees, and lodging...", delay: 1900 },
    { text: `Assembling custom ${daysCount}-day itinerary...`, delay: 2400 }
  ];

  steps.forEach((s, idx) => {
    setTimeout(() => {
      const stepEl = document.getElementById(`genStep${idx + 1}`);
      if (stepEl) {
        stepEl.classList.remove('active');
        stepEl.classList.add('done');
        stepEl.querySelector('.gen-step-icon').innerHTML = '<i class="ph ph-check icon-sm" aria-hidden="true"></i>';
      }
      const nextStep = document.getElementById(`genStep${idx + 2}`);
      if (nextStep) {
        nextStep.classList.add('active');
      }
    }, s.delay);
  });

  setTimeout(() => {
    window.location.hash = 'itinerary';
    showToast(`Your personalized ${daysCount}-day itinerary is ready!`, "ph-sparkle");
  }, 2800);
}

/* ==========================================================================
   MODALS & OVERLAYS (Auth, Add Activity, Share, QR Code)
   ========================================================================== */
function setupModals() {
  // Modal backdrop click to close
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeAllModals();
      }
    });
  });

  // Modal close buttons
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Add Activity Form Submit
  const addActForm = document.getElementById('addActivityForm');
  if (addActForm) {
    addActForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('newActTitle').value;
      const time = document.getElementById('newActTime').value || "3:00 PM";
      const location = document.getElementById('newActLocation').value || "Abuja, Nigeria";
      const cost = parseInt(document.getElementById('newActCost').value) || 5000;
      const category = document.getElementById('newActCategory').value || "Activity";

      const newAct = {
        id: `act-custom-${Date.now()}`,
        title,
        time,
        location,
        category,
        costNGN: cost,
        costUSD: Math.round(cost / 850),
        notes: "Custom traveler activity added to day schedule.",
        image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
        aiBadge: "Custom Addition"
      };

      store.addActivity(store.getState().activeDayIndex, newAct);
      closeAllModals();
      showToast("Activity added to day schedule!");
    });
  }

  // Auth Forms Toggle (Sign In <-> Sign Up)
  const toSignUpLink = document.getElementById('toSignUpLink');
  const toSignInLink = document.getElementById('toSignInLink');
  if (toSignUpLink) {
    toSignUpLink.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('signUpModal');
    });
  }
  if (toSignInLink) {
    toSignInLink.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('signInModal');
    });
  }

  // Edit Profile Form Submit
  const editProfileForm = document.getElementById('editProfileForm');
  if (editProfileForm) {
    editProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = store.getState().user;
      const submitBtn = document.getElementById('editProfileSubmitBtn');
      const errBox = document.getElementById('editProfileError');
      const newName = document.getElementById('editProfileName').value.trim();
      const newLoc = document.getElementById('editProfileLocation').value.trim();
      const newStyle = document.getElementById('editProfileTravelStyle').value.trim();

      if (!newName) return;

      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="ph ph-circle-notch icon-sm" style="animation: spin 0.8s linear infinite;" aria-hidden="true"></i> <span>Saving...</span>`;

      try {
        if (user && user.isLoggedIn && window.authService) {
          await window.authService.updateProfile(user.id, {
            full_name: newName,
            location: newLoc,
            travel_style: newStyle
          });
        }
        // Update local state in store
        store.mergeProfileData({
          full_name: newName,
          location: newLoc,
          travel_style: newStyle
        });
        closeAllModals();
        showToast('Profile updated successfully!', 'ph-check-circle');
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message || 'Failed to update profile.';
          errBox.style.display = 'block';
        } else {
          showToast(err.message || 'Failed to update profile', 'ph-warning-circle');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    });
  }

  // Password Visibility Toggles (Show / Hide)
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const wrapper = btn.closest('.password-input-wrapper');
      const input = wrapper ? wrapper.querySelector('input') : null;
      const icon = btn.querySelector('i');
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.setAttribute('aria-label', 'Hide password');
          if (icon) {
            icon.classList.remove('ph-eye');
            icon.classList.add('ph-eye-slash');
          }
        } else {
          input.type = 'password';
          btn.setAttribute('aria-label', 'Show password');
          if (icon) {
            icon.classList.remove('ph-eye-slash');
            icon.classList.add('ph-eye');
          }
        }
      }
    });
  });

  // Forgot Password Modal Transitions
  const toForgotLink = document.getElementById('toForgotPasswordLink');
  const toSignInFromForgot = document.getElementById('toSignInFromForgotLink');
  if (toForgotLink) {
    toForgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      const signInEmail = document.getElementById('signInEmail');
      const forgotEmail = document.getElementById('forgotPasswordEmail');
      if (signInEmail && forgotEmail && signInEmail.value.trim()) {
        forgotEmail.value = signInEmail.value.trim();
      }
      openModal('forgotPasswordModal');
    });
  }
  if (toSignInFromForgot) {
    toSignInFromForgot.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('signInModal');
    });
  }

  // Forgot Password Form Submit
  const forgotForm = document.getElementById('forgotPasswordForm');
  const forgotEmailInput = document.getElementById('forgotPasswordEmail');
  const forgotSubmitBtn = document.getElementById('forgotPasswordSubmitBtn');
  const forgotError = document.getElementById('forgotPasswordError');
  const forgotNotice = document.getElementById('forgotPasswordNotice');

  if (forgotForm && window.authService) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (forgotError) {
        forgotError.style.display = 'none';
        forgotError.textContent = '';
      }
      if (forgotNotice) {
        forgotNotice.style.display = 'none';
        forgotNotice.textContent = '';
      }

      const email = forgotEmailInput.value.trim();
      if (!email) return;

      const origBtnHTML = forgotSubmitBtn.innerHTML;
      forgotSubmitBtn.disabled = true;
      forgotSubmitBtn.innerHTML = `<i class="ph ph-circle-notch icon-sm" style="animation: spin 0.8s linear infinite;" aria-hidden="true"></i> <span>Sending...</span>`;

      try {
        await window.authService.resetPassword(email);
        if (forgotNotice) {
          forgotNotice.innerHTML = `<strong>Recovery Link Dispatched!</strong> Instructions have been sent to <strong>${email}</strong>. Please check your inbox.`;
          forgotNotice.style.display = 'block';
        }
        showToast('Password reset link sent to your email', 'ph-paper-plane-tilt');
      } catch (err) {
        if (forgotError) {
          forgotError.textContent = err.message || 'Unable to send password reset email.';
          forgotError.style.display = 'block';
        } else {
          showToast(err.message || 'Unable to send reset email', 'ph-warning-circle');
        }
      } finally {
        forgotSubmitBtn.disabled = false;
        forgotSubmitBtn.innerHTML = origBtnHTML;
      }
    });
  }
}

function openModal(modalId) {
  closeAllModals();
  const target = document.getElementById(modalId);
  if (target) {
    target.classList.add('active');
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
}

function openEditProfileModal() {
  const user = store.getState().user;
  const nameInput = document.getElementById('editProfileName');
  const locInput = document.getElementById('editProfileLocation');
  const styleInput = document.getElementById('editProfileTravelStyle');
  const errBox = document.getElementById('editProfileError');

  if (errBox) {
    errBox.style.display = 'none';
    errBox.textContent = '';
  }

  if (nameInput) nameInput.value = user.name || '';
  if (locInput) locInput.value = user.location || '';
  if (styleInput) styleInput.value = user.travelStyle || 'Art & Culture Explorer';

  openModal('editProfileModal');
}

function openAddActivityModal() {
  openModal('addActivityModal');
}

function openShareModal() {
  openModal('shareSheetModal');
}

function openSaveSuccessModal() {
  store.saveCurrentTrip();
  openModal('saveSuccessModal');
}

function openQRCodeModal() {
  openModal('qrCodeModal');
  renderCanvasQRCode();
}

function copyTripLink() {
  const link = "https://wayfind.travel/trips/abuja-art-nature-001";
  navigator.clipboard.writeText(link).then(() => {
    showToast("Link copied to clipboard!", "ph-copy");
  }).catch(() => {
    showToast("Link: " + link, "ph-copy");
  });
}

function shareOnWhatsApp() {
  const text = encodeURIComponent("Check out my curated Abuja AI trip itinerary on Wayfind: https://wayfind.travel/trips/abuja-art-nature-001");
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

/* High-fidelity Canvas QR Code Generator */
function renderCanvasQRCode() {
  const canvas = document.getElementById('qrCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 190;
  canvas.width = size;
  canvas.height = size;

  // Clear white background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);

  // Draw simulated QR matrix with Finder patterns
  const moduleCount = 25;
  const moduleSize = size / moduleCount;

  ctx.fillStyle = "#1E2720";

  // Finder pattern top-left
  drawFinderPattern(ctx, 0, 0, moduleSize);
  // Finder pattern top-right
  drawFinderPattern(ctx, (moduleCount - 7) * moduleSize, 0, moduleSize);
  // Finder pattern bottom-left
  drawFinderPattern(ctx, 0, (moduleCount - 7) * moduleSize, moduleSize);

  // Deterministic pseudo-random inner matrix for visual fidelity
  let seed = 42;
  function random() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      // Skip finder areas
      if ((r < 7 && c < 7) || (r < 7 && c >= moduleCount - 7) || (r >= moduleCount - 7 && c < 7)) {
        continue;
      }
      if (random() > 0.45) {
        ctx.fillRect(c * moduleSize, r * moduleSize, moduleSize - 0.5, moduleSize - 0.5);
      }
    }
  }

  // Draw brand center icon badge
  const centerSize = moduleSize * 5;
  const centerPos = (size - centerSize) / 2;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(centerPos - 2, centerPos - 2, centerSize + 4, centerSize + 4);
  ctx.fillStyle = "#3B4A20";
  ctx.fillRect(centerPos, centerPos, centerSize, centerSize);
  
  // Center compass dot
  ctx.fillStyle = "#E1EFC9";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, moduleSize * 1.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawFinderPattern(ctx, x, y, modSize) {
  ctx.fillRect(x, y, modSize * 7, modSize * 7);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x + modSize, y + modSize, modSize * 5, modSize * 5);
  ctx.fillStyle = "#1E2720";
  ctx.fillRect(x + modSize * 2, y + modSize * 2, modSize * 3, modSize * 3);
}

/* ==========================================================================
   AI TRAVEL COMPANION CHATBOT ENGINE
   ========================================================================== */
function setupChatbot() {
  const toggleBtn = document.getElementById('chatbotTogglePill');
  const widget = document.getElementById('aiChatbotWidget');
  const closeBtn = document.getElementById('closeChatbotBtn');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendChatBtn');

  if (toggleBtn && widget) {
    toggleBtn.addEventListener('click', () => {
      widget.classList.toggle('open');
      if (widget.classList.contains('open') && chatInput) {
        setTimeout(() => chatInput.focus(), 200);
      }
    });
  }

  if (closeBtn && widget) {
    closeBtn.addEventListener('click', () => {
      widget.classList.remove('open');
    });
  }

  function handleSend() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    // Append user message
    store.addChatMessage('user', text);
    renderChatMessages();

    // AI thinking simulation
    setTimeout(() => {
      const reply = getAIResponse(text);
      store.addChatMessage('ai', reply);
      renderChatMessages();
    }, 600);
  }

  if (sendBtn) sendBtn.addEventListener('click', handleSend);
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }

  // Quick prompt chips
  document.querySelectorAll('.chat-quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (chatInput) {
        chatInput.value = prompt;
        handleSend();
      }
    });
  });

  renderChatMessages();
}

function renderChatMessages() {
  const stream = document.getElementById('chatbotMessagesStream');
  if (!stream) return;
  const history = store.getState().chatMessages;

  stream.innerHTML = history.map(m => `
    <div class="chat-bubble ${m.sender === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'} animate-fade-in">
      <div>${formatMarkdownBasic(m.text)}</div>
      <span class="chat-time">${m.time}</span>
    </div>
  `).join('');

  stream.scrollTop = stream.scrollHeight;
}

function getAIResponse(userText) {
  const lower = userText.toLowerCase();
  for (const intent of WAYFIND_DATA.chatbotIntents) {
    for (const kw of intent.keywords) {
      if (lower.includes(kw)) {
        return intent.reply;
      }
    }
  }
  return WAYFIND_DATA.defaultChatbotReply;
}

function formatMarkdownBasic(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

/* ==========================================================================
   TOAST NOTIFICATION HELPER
   ========================================================================== */
function showToast(msg, iconClass = 'ph-check-circle') {
  let toast = document.getElementById('wayfindToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'wayfindToast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(30px);
      background: var(--color-surface);
      color: var(--color-text-headline);
      border: 1px solid var(--color-primary);
      box-shadow: var(--shadow-lg);
      padding: 12px 24px;
      border-radius: var(--radius-full);
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 0.9rem;
      z-index: 999;
      opacity: 0;
      pointer-events: none;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<i class="ph ${iconClass} icon-md" style="color: var(--color-primary);" aria-hidden="true"></i> <span>${msg}</span>`;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(30px)';
  }, 3000);
}

/* ==========================================================================
   SUPABASE AUTHENTICATION CONTROLLER & UI SYNC
   ========================================================================== */

function setupAuth() {
  // Sign In Form submission
  const signInForm = document.getElementById('signInForm');
  const signInEmail = document.getElementById('signInEmail');
  const signInPassword = document.getElementById('signInPassword');
  const signInSubmitBtn = document.getElementById('signInSubmitBtn');
  const signInError = document.getElementById('signInError');
  const signInRememberMe = document.getElementById('signInRememberMe');

  // Pre-fill remembered email if saved
  const savedRememberEmail = localStorage.getItem('wayfind_remember_email');
  if (savedRememberEmail && signInEmail) {
    signInEmail.value = savedRememberEmail;
    if (signInRememberMe) {
      signInRememberMe.checked = true;
    }
  }

  if (signInForm && window.authService) {
    signInForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (signInError) {
        signInError.style.display = 'none';
        signInError.textContent = '';
      }

      const email = signInEmail.value.trim();
      const password = signInPassword.value;
      if (!email || !password) return;

      const originalBtnHTML = signInSubmitBtn.innerHTML;
      signInSubmitBtn.disabled = true;
      signInSubmitBtn.innerHTML = `<i class="ph ph-circle-notch icon-sm" style="animation: spin 0.8s linear infinite;" aria-hidden="true"></i> <span>Signing In...</span>`;

      try {
        await window.authService.signIn(email, password);

        // Manage Remember Me preference
        if (signInRememberMe && signInRememberMe.checked) {
          localStorage.setItem('wayfind_remember_email', email);
        } else {
          localStorage.removeItem('wayfind_remember_email');
        }

        closeAllModals();
        signInForm.reset();
        showToast('Signed in successfully!', 'ph-check-circle');
      } catch (err) {
        if (signInError) {
          signInError.textContent = err.message || 'Unable to sign in. Please verify your credentials.';
          signInError.style.display = 'block';
        } else {
          showToast(err.message || 'Unable to sign in', 'ph-warning-circle');
        }
      } finally {
        signInSubmitBtn.disabled = false;
        signInSubmitBtn.innerHTML = originalBtnHTML;
      }
    });
  }

  // Sign Up Form submission
  const signUpForm = document.getElementById('signUpForm');
  const signUpFullName = document.getElementById('signUpFullName');
  const signUpEmail = document.getElementById('signUpEmail');
  const signUpPassword = document.getElementById('signUpPassword');
  const signUpSubmitBtn = document.getElementById('signUpSubmitBtn');
  const signUpError = document.getElementById('signUpError');
  const signUpNotice = document.getElementById('signUpNotice');

  if (signUpForm && window.authService) {
    signUpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (signUpError) {
        signUpError.style.display = 'none';
        signUpError.textContent = '';
      }
      if (signUpNotice) {
        signUpNotice.style.display = 'none';
        signUpNotice.textContent = '';
      }

      const fullName = signUpFullName.value.trim();
      const email = signUpEmail.value.trim();
      const password = signUpPassword.value;
      const confirmPassword = document.getElementById('signUpConfirmPassword')?.value;

      if (!fullName || !email || !password) return;

      // Validate matching passwords
      if (confirmPassword !== undefined && password !== confirmPassword) {
        if (signUpError) {
          signUpError.textContent = 'Passwords do not match. Please verify and try again.';
          signUpError.style.display = 'block';
        } else {
          showToast('Passwords do not match', 'ph-warning-circle');
        }
        return;
      }

      const originalBtnHTML = signUpSubmitBtn.innerHTML;
      signUpSubmitBtn.disabled = true;
      signUpSubmitBtn.innerHTML = `<i class="ph ph-circle-notch icon-sm" style="animation: spin 0.8s linear infinite;" aria-hidden="true"></i> <span>Creating Account...</span>`;

      try {
        const data = await window.authService.signUp(fullName, email, password);
        
        // When email autoconfirm is enabled, session is directly provided
        if (data && data.session) {
          closeAllModals();
          signUpForm.reset();
          showToast(`Welcome to Wayfind, ${fullName}!`, 'ph-sparkle');
        } else {
          // If Supabase project requires email confirmation (mailer_autoconfirm: false)
          if (signUpNotice) {
            signUpNotice.innerHTML = `<strong>Account registered!</strong> We've sent a verification email to <strong>${email}</strong>. Please check your inbox and verify your address before signing in.`;
            signUpNotice.style.display = 'block';
          }
          signUpForm.reset();
          showToast('Confirmation email sent! Check your inbox.', 'ph-envelope-simple');
        }
      } catch (err) {
        if (signUpError) {
          signUpError.textContent = err.message || 'Unable to create account.';
          signUpError.style.display = 'block';
        } else {
          showToast(err.message || 'Unable to create account', 'ph-warning-circle');
        }
      } finally {
        signUpSubmitBtn.disabled = false;
        signUpSubmitBtn.innerHTML = originalBtnHTML;
      }
    });
  }
}

/**
 * Route "Get Started" and "Start Planning" buttons:
 * Non-authenticated users are directed to the Sign Up page/modal.
 * Authenticated users are directed to the Trip Planner (#planner).
 */
function handleStartPlanningAction(e) {
  if (e) e.preventDefault();
  const user = store.getState().user;
  if (!user || !user.isLoggedIn) {
    openModal('signUpModal');
  } else {
    window.location.hash = 'planner';
  }
}
window.handleStartPlanningAction = handleStartPlanningAction;

/**
 * Handle third-party OAuth sign in / sign up (e.g. Google, Apple)
 */
async function handleOAuthSignIn(provider) {
  if (!window.authService) {
    showToast('Auth service initializing. Please try again.', 'ph-warning-circle');
    return;
  }

  try {
    showToast(`Connecting to ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`, 'ph-sparkle');
    await window.authService.signInWithOAuth(provider);
  } catch (err) {
    console.error('OAuth error:', err);
    const msg = err.message || '';
    const friendlyNotice = msg.toLowerCase().includes('not enabled') || msg.toLowerCase().includes('provider')
      ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} Sign-In requires activating the provider in your Supabase Dashboard under Authentication > Providers > ${provider.charAt(0).toUpperCase() + provider.slice(1)}.`
      : (err.message || 'Unable to connect to OAuth provider.');

    const errBox = document.getElementById('signInError') || document.getElementById('signUpError');
    if (errBox) {
      errBox.textContent = friendlyNotice;
      errBox.style.display = 'block';
    }
    showToast(friendlyNotice, 'ph-warning-circle');
  }
}
window.handleOAuthSignIn = handleOAuthSignIn;

/**
 * Trigger Supabase Password Reset for user
 */
async function handleResetPassword() {
  if (!window.authService) return;
  const user = store.getState().user;
  const defaultEmail = (user && user.isLoggedIn && user.email) ? user.email : '';

  const email = prompt('Enter your registered email address to receive a password reset link:', defaultEmail);
  if (!email || !email.trim()) return;

  try {
    await window.authService.resetPassword(email.trim());
    showToast(`Password reset link sent to ${email.trim()}`, 'ph-paper-plane-tilt');
  } catch (err) {
    showToast(err.message || 'Failed to send password reset email.', 'ph-warning-circle');
  }
}

/**
 * Synchronize UI elements with active authentication state, avatars, and settings
 */
function updateUserUI(user) {
  if (!user) return;

  // Synchronize body class for logged-in responsive header behavior (mobile & tablet)
  document.body.classList.toggle('user-logged-in', !!(user && user.isLoggedIn));

  const headerAuthBtn = document.getElementById('headerAuthBtn');
  const headerAuthBtnText = document.getElementById('headerAuthBtnText');
  const headerProfileDropdown = document.getElementById('headerProfileDropdown');
  const headerAvatarInitials = document.getElementById('headerAvatarInitials');
  const menuAvatarInitials = document.getElementById('menuAvatarInitials');
  const menuUserName = document.getElementById('menuUserName');
  const menuUserEmail = document.getElementById('menuUserEmail');
  const headerGetStartedBtn = document.getElementById('headerGetStartedBtn');
  const dashGreetingName = document.getElementById('dashGreetingName');
  const dashProfileAvatar = document.getElementById('dashProfileAvatar');
  const dashProfileName = document.getElementById('dashProfileName');
  const dashProfileEmail = document.getElementById('dashProfileEmail');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const settingsCurrencySelect = document.getElementById('settingsCurrencySelect');
  const settingsAccessibilitySwitch = document.getElementById('settingsAccessibilitySwitch');
  const settingsThemeSwitch = document.getElementById('settingsThemeSwitch');
  const headerA11yContainer = document.getElementById('headerA11yContainer');

  const firstName = user.name ? user.name.split(' ')[0] : 'Traveler';

  // Always keep accessibility icon visible in header between Dashboard and theme toggle
  if (headerA11yContainer) headerA11yContainer.style.display = 'inline-block';

  if (user.isLoggedIn) {
    // Show active user avatar dropdown, hide generic sign in button
    if (headerAuthBtn) headerAuthBtn.style.display = 'none';
    if (headerProfileDropdown) headerProfileDropdown.style.display = 'inline-block';
    renderAvatarBadge(headerAvatarInitials, user.avatarText, user.avatarUrl);
    renderAvatarBadge(menuAvatarInitials, user.avatarText, user.avatarUrl);
    if (menuUserName) menuUserName.textContent = user.name;
    if (menuUserEmail) menuUserEmail.textContent = user.email || 'traveler@wayfind.travel';

    if (headerGetStartedBtn) headerGetStartedBtn.title = 'Trip Planner';
    if (dashGreetingName) dashGreetingName.textContent = firstName;
    renderAvatarBadge(dashProfileAvatar, user.avatarText, user.avatarUrl);
    if (dashProfileName) dashProfileName.textContent = user.name;
    if (dashProfileEmail) dashProfileEmail.textContent = user.email || 'traveler@wayfind.travel';

    renderAvatarBadge(profileAvatar, user.avatarText, user.avatarUrl);
    if (profileName) profileName.textContent = user.name;
    if (profileEmail) profileEmail.textContent = user.email || 'traveler@wayfind.travel';
  } else {
    // Show sign in button, hide profile dropdown
    if (headerAuthBtn) {
      headerAuthBtn.style.display = 'inline-flex';
      headerAuthBtn.title = 'Sign In to Wayfind';
      headerAuthBtn.onclick = (e) => {
        e.preventDefault();
        openModal('signInModal');
      };
    }
    if (headerAuthBtnText) headerAuthBtnText.textContent = 'Sign In';
    if (headerProfileDropdown) headerProfileDropdown.style.display = 'none';

    if (headerGetStartedBtn) headerGetStartedBtn.title = 'Sign Up to Start Planning';
    if (dashGreetingName) dashGreetingName.textContent = 'Traveler';
    renderAvatarBadge(dashProfileAvatar, 'GT', null);
    if (dashProfileName) dashProfileName.textContent = 'Guest Traveler';
    if (dashProfileEmail) dashProfileEmail.textContent = 'guest@wayfind.travel';

    renderAvatarBadge(profileAvatar, 'GT', null);
    if (profileName) profileName.textContent = 'Guest Traveler';
    if (profileEmail) profileEmail.textContent = 'guest@wayfind.travel';
  }

  // Synchronize Mobile Drawer Action Buttons
  const mobileAuthBtn = document.getElementById('mobileAuthBtn');
  const mobileGetStartedBtn = document.getElementById('mobileGetStartedBtn');
  if (mobileAuthBtn && mobileGetStartedBtn) {
    if (user.isLoggedIn) {
      mobileAuthBtn.innerHTML = '<span>Manage Account</span>';
      mobileAuthBtn.onclick = () => { closeMobileMenu(); window.location.hash = 'profile'; };
      mobileGetStartedBtn.innerHTML = '<span>Log Out</span>';
      mobileGetStartedBtn.onclick = () => { closeMobileMenu(); if (window.authService) window.authService.signOut(); };
    } else {
      mobileAuthBtn.innerHTML = '<span>Log In</span>';
      mobileAuthBtn.onclick = () => { closeMobileMenu(); openModal('signInModal'); };
      mobileGetStartedBtn.innerHTML = '<span>Start Planning</span>';
      mobileGetStartedBtn.onclick = (e) => { closeMobileMenu(); handleStartPlanningAction(e); };
    }
  }

  // Synchronize Settings Controls
  if (settingsCurrencySelect) {
    settingsCurrencySelect.value = store.getState().currency;
  }
  if (settingsAccessibilitySwitch) {
    settingsAccessibilitySwitch.checked = store.getState().isHighContrast;
  }
  if (settingsThemeSwitch) {
    settingsThemeSwitch.checked = store.getState().theme === 'dark';
  }

  renderCartoonAvatars();
}

/**
 * Universal Avatar Badge Renderer: Handles custom photo, cartoon SVG, or initials
 */
function renderAvatarBadge(container, avatarText, avatarUrl) {
  if (!container) return;
  if (avatarUrl) {
    container.innerHTML = `<img src="${avatarUrl}" alt="${avatarText || 'Avatar'}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;" />`;
    container.style.padding = '0';
  } else {
    container.textContent = avatarText || 'TR';
    container.style.padding = '';
  }
}

/**
 * Render 6 Travel Cartoon Avatars in Settings
 */
function renderCartoonAvatars() {
  const container = document.getElementById('cartoonAvatarGrid');
  if (!container || !WAYFIND_DATA.cartoonAvatars) return;

  const currentAvatarUrl = store.getState().user?.avatarUrl;

  container.innerHTML = WAYFIND_DATA.cartoonAvatars.map(av => {
    const isActive = currentAvatarUrl === av.url;
    return `
      <div class="cartoon-avatar-item ${isActive ? 'active' : ''}" onclick="selectCartoonAvatar('${av.id}')" title="${av.name} (${av.role})">
        <img src="${av.url}" alt="${av.name}" class="cartoon-avatar-img" />
        <span class="cartoon-avatar-label">${av.name}</span>
      </div>
    `;
  }).join('');
}

/**
 * Select a Cartoon Avatar
 */
async function selectCartoonAvatar(avatarId) {
  const avatar = WAYFIND_DATA.cartoonAvatars.find(a => a.id === avatarId);
  if (!avatar) return;

  store.updateAvatar(avatar.url);

  // If user is logged in, sync to Supabase
  const user = store.getState().user;
  if (user && user.isLoggedIn && window.authService) {
    try {
      await window.authService.updateProfile(user.id, { avatar_url: avatar.url });
    } catch (e) {
      console.warn('Avatar cloud sync skipped:', e.message);
    }
  }

  renderCartoonAvatars();
  showToast(`Profile avatar updated to ${avatar.name}!`, 'ph-sparkle');
}

/**
 * Handle Custom Photo File Upload
 */
function handleAvatarFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file.', 'ph-warning-circle');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    store.updateAvatar(dataUrl);

    const user = store.getState().user;
    if (user && user.isLoggedIn && window.authService) {
      try {
        await window.authService.updateProfile(user.id, { avatar_url: dataUrl });
      } catch (err) {
        console.warn('Photo cloud sync skipped:', err.message);
      }
    }

    renderCartoonAvatars();
    showToast('Profile photo uploaded!', 'ph-check-circle');
  };
  reader.readAsDataURL(file);
}

/**
 * Reset Avatar back to initials
 */
async function resetAvatarToInitials() {
  store.updateAvatar(null);

  const user = store.getState().user;
  if (user && user.isLoggedIn && window.authService) {
    try {
      await window.authService.updateProfile(user.id, { avatar_url: null });
    } catch (e) {
      console.warn('Avatar reset cloud sync skipped:', e.message);
    }
  }

  renderCartoonAvatars();
  showToast('Avatar reset to initials.', 'ph-arrows-counter-clockwise');
}

/**
 * Remove Profile Photo and restore default initials
 */
async function removeProfilePhoto() {
  store.updateAvatar(null);

  const user = store.getState().user;
  if (user && user.isLoggedIn && window.authService) {
    try {
      await window.authService.updateProfile(user.id, { avatar_url: null });
    } catch (e) {
      console.warn('Avatar remove cloud sync skipped:', e.message);
    }
  }

  renderCartoonAvatars();
  showToast('Profile photo removed.', 'ph-trash');
}

/* ==========================================================================
   ACCESSIBILITY MENU CONTROLLER & FEATURES
   ========================================================================== */
function closeAllA11yMenus(e) {
  if (e) {
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    if (typeof e.preventDefault === 'function') e.preventDefault();
  }
  document.querySelectorAll('.a11y-dropdown-container').forEach(c => {
    c.classList.remove('open');
    c.classList.add('a11y-dismissed');
  });
  const mobileModal = document.getElementById('a11yMobileModal');
  if (mobileModal) mobileModal.classList.remove('active');
  const overlay = document.getElementById('a11yMobileOverlay');
  if (overlay) overlay.classList.remove('active');
}

function handleA11yTextToSpeech() {
  if (!('speechSynthesis' in window)) {
    showToast('Text to Speech is not supported in this browser.', 'ph-warning-circle');
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    showToast('Text to speech stopped.', 'ph-speaker-slash');
    return;
  }

  const activeView = document.querySelector('.view-container.active-view') || document.querySelector('main') || document.body;
  const elements = Array.from(activeView.querySelectorAll('h1, h2, h3, h4, p, .hero-tagline, .section-subtitle'))
    .filter(el => el.offsetParent !== null && el.textContent.trim().length > 0)
    .slice(0, 15);

  const textToRead = elements.map(el => el.textContent.trim()).join('. ');
  if (!textToRead) {
    showToast('No readable text found on current page.', 'ph-warning-circle');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(textToRead);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.onend = () => {
    showToast('Speech finished.', 'ph-speaker-high');
  };
  utterance.onerror = () => {
    showToast('Speech stopped.', 'ph-speaker-slash');
  };

  window.speechSynthesis.speak(utterance);
  showToast('Reading content aloud... Click again to stop.', 'ph-speaker-high');
}

function getA11yFontScale() {
  const saved = localStorage.getItem('wayfind_a11y_font_scale');
  return saved ? parseInt(saved, 10) : 100;
}

function setA11yFontScale(scale) {
  const clamped = Math.max(75, Math.min(135, scale));
  document.documentElement.style.fontSize = clamped + '%';
  localStorage.setItem('wayfind_a11y_font_scale', clamped.toString());
  showToast(`Font size: ${clamped}%`, 'ph-text-aa');
}

function handleA11yDecreaseFont() {
  const current = getA11yFontScale();
  setA11yFontScale(current - 5);
}

function handleA11yIncreaseFont() {
  const current = getA11yFontScale();
  setA11yFontScale(current + 5);
}

const A11Y_FONTS = ['default', 'dyslexic', 'readable', 'monospace'];
const A11Y_FONT_LABELS = {
  default: 'System Display (Default)',
  dyslexic: 'Dyslexia Friendly',
  readable: 'Clean Sans-Serif',
  monospace: 'Monospace Code'
};

function handleA11yFontFamily() {
  const current = document.documentElement.getAttribute('data-a11y-font') || 'default';
  const currentIndex = A11Y_FONTS.indexOf(current);
  const nextIndex = (currentIndex + 1) % A11Y_FONTS.length;
  const nextFont = A11Y_FONTS[nextIndex];

  if (nextFont === 'default') {
    document.documentElement.removeAttribute('data-a11y-font');
    localStorage.removeItem('wayfind_a11y_font');
  } else {
    document.documentElement.setAttribute('data-a11y-font', nextFont);
    localStorage.setItem('wayfind_a11y_font', nextFont);
  }

  showToast(`Font: ${A11Y_FONT_LABELS[nextFont] || nextFont}`, 'ph-text-t');
}

const A11Y_THEMES = ['normal', 'yellow-black', 'black-white', 'sepia', 'inverted'];
const A11Y_THEME_LABELS = {
  normal: 'Standard Colors',
  'yellow-black': 'High Contrast Yellow on Black',
  'black-white': 'High Contrast Black on White',
  sepia: 'Sepia Warm',
  inverted: 'Color Inverted'
};

function handleA11yColorTheme() {
  const current = document.documentElement.getAttribute('data-a11y-theme') || 'normal';
  const currentIndex = A11Y_THEMES.indexOf(current);
  const nextIndex = (currentIndex + 1) % A11Y_THEMES.length;
  const nextTheme = A11Y_THEMES[nextIndex];

  if (nextTheme === 'normal') {
    document.documentElement.removeAttribute('data-a11y-theme');
    localStorage.removeItem('wayfind_a11y_theme');
  } else {
    document.documentElement.setAttribute('data-a11y-theme', nextTheme);
    localStorage.setItem('wayfind_a11y_theme', nextTheme);
  }

  showToast(`Theme: ${A11Y_THEME_LABELS[nextTheme] || nextTheme}`, 'ph-paint-bucket');
}

function handleA11ySimplifyContent() {
  const isSimplified = document.documentElement.getAttribute('data-a11y-simplify') === 'true';
  if (isSimplified) {
    document.documentElement.removeAttribute('data-a11y-simplify');
    localStorage.removeItem('wayfind_a11y_simplify');
    showToast('Standard visual layout restored', 'ph-check-circle');
  } else {
    document.documentElement.setAttribute('data-a11y-simplify', 'true');
    localStorage.setItem('wayfind_a11y_simplify', 'true');
    showToast('Simplify Content enabled (decorative effects hidden)', 'ph-list');
  }
}

function handleA11yResetDefaults() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  document.documentElement.style.fontSize = '';
  document.documentElement.removeAttribute('data-a11y-font');
  document.documentElement.removeAttribute('data-a11y-theme');
  document.documentElement.removeAttribute('data-a11y-simplify');

  localStorage.removeItem('wayfind_a11y_font_scale');
  localStorage.removeItem('wayfind_a11y_font');
  localStorage.removeItem('wayfind_a11y_theme');
  localStorage.removeItem('wayfind_a11y_simplify');

  showToast('Accessibility settings reset to default', 'ph-arrows-counter-clockwise');
}

function setupA11yMenus() {
  // Restore saved accessibility preferences
  const savedScale = localStorage.getItem('wayfind_a11y_font_scale');
  if (savedScale) {
    document.documentElement.style.fontSize = savedScale + '%';
  }
  const savedFont = localStorage.getItem('wayfind_a11y_font');
  if (savedFont && savedFont !== 'default') {
    document.documentElement.setAttribute('data-a11y-font', savedFont);
  }
  const savedTheme = localStorage.getItem('wayfind_a11y_theme');
  if (savedTheme && savedTheme !== 'normal') {
    document.documentElement.setAttribute('data-a11y-theme', savedTheme);
  }
  const savedSimplify = localStorage.getItem('wayfind_a11y_simplify');
  if (savedSimplify === 'true') {
    document.documentElement.setAttribute('data-a11y-simplify', 'true');
  }

  // Reset dismissed state on mouseleave so hovering again works freshly
  document.querySelectorAll('.a11y-dropdown-container').forEach(container => {
    container.addEventListener('mouseleave', () => {
      container.classList.remove('a11y-dismissed');
    });
  });

  // Click handler for accessibility trigger buttons
  document.querySelectorAll('.a11y-trigger-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (window.innerWidth <= 768) {
        // Mobile View: Always open centered accessibility modal
        closeAllA11yMenus();
        const mobileModal = document.getElementById('a11yMobileModal');
        if (mobileModal) {
          mobileModal.classList.add('active');
        } else {
          openModal('a11yMobileModal');
        }
      } else {
        // Desktop View: Toggle dropdown popout
        const container = btn.closest('.a11y-dropdown-container');
        if (!container) return;
        const wasOpen = container.classList.contains('open') && !container.classList.contains('a11y-dismissed');
        document.querySelectorAll('.a11y-dropdown-container').forEach(c => {
          c.classList.remove('open');
        });
        container.classList.remove('a11y-dismissed');
        if (!wasOpen) {
          container.classList.add('open');
        }
      }
    });
  });

  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.a11y-dropdown-container') && !e.target.closest('#a11yMobileModal')) {
      closeAllA11yMenus();
    }
  });
}

window.renderAvatarBadge = renderAvatarBadge;
window.renderCartoonAvatars = renderCartoonAvatars;
window.selectCartoonAvatar = selectCartoonAvatar;
window.handleAvatarFileUpload = handleAvatarFileUpload;
window.resetAvatarToInitials = resetAvatarToInitials;
window.removeProfilePhoto = removeProfilePhoto;

window.closeAllA11yMenus = closeAllA11yMenus;
window.openMobileMenu = openMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.handleA11yTextToSpeech = handleA11yTextToSpeech;
window.handleA11yDecreaseFont = handleA11yDecreaseFont;
window.handleA11yIncreaseFont = handleA11yIncreaseFont;
window.handleA11yFontFamily = handleA11yFontFamily;
window.handleA11yColorTheme = handleA11yColorTheme;
window.handleA11ySimplifyContent = handleA11ySimplifyContent;
window.handleA11yResetDefaults = handleA11yResetDefaults;

// Header Profile Menu Click & Hover Toggle Controller
const profileDropdown = document.getElementById('headerProfileDropdown');
const avatarBtn = document.getElementById('headerAvatarBtn');
const menuManageAccountLink = document.getElementById('menuManageAccountLink');

if (avatarBtn && profileDropdown) {
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (typeof closeAllA11yMenus === 'function') closeAllA11yMenus();

    const menu = document.getElementById('headerProfileMenu');
    // Check if dropdown is currently visually open (via class 'open' or active hover)
    const isCurrentlyOpen = profileDropdown.classList.contains('open') ||
      (!profileDropdown.classList.contains('profile-dismissed') && menu && window.getComputedStyle(menu).visibility === 'visible' && window.getComputedStyle(menu).opacity !== '0');

    if (isCurrentlyOpen) {
      // Toggle OFF: Close it explicitly
      profileDropdown.classList.remove('open');
      profileDropdown.classList.add('profile-dismissed');
      avatarBtn.blur();
    } else {
      // Toggle ON: Open it
      profileDropdown.classList.remove('profile-dismissed');
      profileDropdown.classList.add('open');
    }
  });

  // Reset dismissal state on mouseleave so subsequent hovers naturally open the menu again
  profileDropdown.addEventListener('mouseleave', () => {
    profileDropdown.classList.remove('profile-dismissed');
    profileDropdown.classList.remove('open');
  });
}

// Close Header Profile Menu on click outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('headerProfileDropdown');
  if (dropdown && !dropdown.contains(e.target)) {
    dropdown.classList.remove('open');
    dropdown.classList.remove('profile-dismissed');
  }
});

if (menuManageAccountLink) {
  menuManageAccountLink.addEventListener('click', () => {
    const dropdown = document.getElementById('headerProfileDropdown');
    if (dropdown) {
      dropdown.classList.remove('open');
      dropdown.classList.add('profile-dismissed');
    }
  });
}

// Global Wizard Calendar & Budget Exports
window.wizardCalendarQuickSelect = wizardCalendarQuickSelect;
window.wizardCalendarClear = wizardCalendarClear;
window.handleWizardCurrencyChange = handleWizardCurrencyChange;
window.updateBudgetUI = updateBudgetUI;

// Universal Dates Overlay Exports
window.openDateOverlay = openDateOverlay;
window.closeDateOverlay = closeDateOverlay;
window.applyDateOverlay = applyDateOverlay;
window.overlayCalendarQuickSelect = overlayCalendarQuickSelect;
window.overlayCalendarClear = overlayCalendarClear;
