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

  // 8. Subscribe UI re-renderers to State Changes
  store.subscribe((state) => {
    renderCurrentView(state);
    updateThemeLogos(state.theme);
    updateUserUI(state.user);
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

      window.location.hash = targetRoute;
      closeMobileMenu();
    });
  });

  // Mobile menu hamburger toggle
  const mobileToggle = document.getElementById('mobileNavToggle');
  const navLinks = document.getElementById('navLinks');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
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

function closeMobileMenu() {
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

  // Update active state in nav links
  document.querySelectorAll('.nav-link').forEach(link => {
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

  // 1. Render Days Tab Bar
  daysNav.innerHTML = trip.days.map((day, idx) => `
    <button class="day-tab-btn ${idx === state.activeDayIndex ? 'active' : ''}" onclick="selectDayIndex(${idx})">
      Day ${day.dayNumber}: ${day.date.split(',')[0]}
    </button>
  `).join('');

  // 2. Render Activities Timeline for Active Day
  const activeDay = trip.days[state.activeDayIndex] || trip.days[0];
  const dayTitleEl = document.getElementById('itineraryActiveDayTitle');
  if (dayTitleEl) {
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
      const displayCost = state.currency === 'NGN' 
        ? `₦${(act.costNGN || 0).toLocaleString()}`
        : `$${(act.costUSD || 0)}`;

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
    const totalCostStr = state.currency === 'NGN' 
      ? `₦${trip.budgetTotalNGN.toLocaleString()}`
      : `$${trip.budgetTotalUSD.toLocaleString()}`;

    budgetPanel.innerHTML = `
      <div class="budget-total-header">
        <p>Estimated Total (${trip.duration})</p>
        <h3>${totalCostStr}</h3>
        <div style="margin-top: 8px; display: flex; gap: 8px;">
          <button class="btn btn-ghost btn-sm" onclick="store.toggleCurrency()" style="font-size: 0.78rem; padding: 4px 10px;">
            Currency: ${state.currency} (Switch)
          </button>
        </div>
      </div>
      <div class="budget-category-list">
        ${trip.budgetBreakdown.map(cat => {
          const catAmount = state.currency === 'NGN' 
            ? `₦${cat.allocatedNGN.toLocaleString()}` 
            : `$${cat.allocatedUSD}`;
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

  if (coverEl) coverEl.src = activeTrip.coverImage;
  if (titleEl) titleEl.textContent = activeTrip.title;
  if (datesEl) datesEl.textContent = `${activeTrip.destination} • ${activeTrip.dates}`;
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
            ₦${trip.budgetTotalNGN.toLocaleString()}
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
          <span style="font-size: 0.85rem; color: var(--color-text-muted);">From <strong>${d.avgBudgetPerDay}</strong>/day</span>
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
      triggerAIGeneration();
    });
  }

  // Budget slider real-time label update
  const budgetSlider = document.getElementById('wizardBudgetSlider');
  const budgetDisplay = document.getElementById('wizardBudgetVal');
  if (budgetSlider && budgetDisplay) {
    budgetSlider.addEventListener('input', (e) => {
      budgetDisplay.textContent = `$${parseInt(e.target.value).toLocaleString()}`;
    });
  }

  // Chip toggles for companions & preferences
  document.querySelectorAll('.choice-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      // If single choice within parent group, uncheck siblings
      const parent = chip.parentElement;
      if (parent.classList.contains('single-select')) {
        parent.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
      }
      chip.classList.toggle('active');
    });
  });
}

function triggerAIGeneration() {
  // Navigate to 'generating' state
  store.setView('generating');
  
  const steps = [
    { text: "Analyzing travel preferences and companion needs...", delay: 600 },
    { text: "Optimizing scenic routes across Abuja & Niger State...", delay: 1300 },
    { text: "Balancing curated dining, admission fees, and lodging...", delay: 1900 },
    { text: "Assembling custom 4-day itinerary...", delay: 2400 }
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
    showToast("Your personalized Abuja itinerary is ready!", "ph-sparkle");
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
 * Synchronize UI elements with active authentication state
 */
function updateUserUI(user) {
  if (!user) return;

  const headerAuthBtn = document.getElementById('headerAuthBtn');
  const headerAuthBtnText = document.getElementById('headerAuthBtnText');
  const headerGetStartedBtn = document.getElementById('headerGetStartedBtn');
  const dashGreetingName = document.getElementById('dashGreetingName');
  const dashProfileAvatar = document.getElementById('dashProfileAvatar');
  const dashProfileName = document.getElementById('dashProfileName');
  const dashProfileEmail = document.getElementById('dashProfileEmail');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');

  const firstName = user.name ? user.name.split(' ')[0] : 'Traveler';

  if (user.isLoggedIn) {
    if (headerAuthBtnText) {
      headerAuthBtnText.textContent = firstName;
    }
    if (headerAuthBtn) {
      headerAuthBtn.title = `Signed in as ${user.name} (${user.email})`;
      headerAuthBtn.onclick = (e) => {
        e.preventDefault();
        window.location.hash = 'profile';
      };
    }
    if (headerGetStartedBtn) {
      headerGetStartedBtn.title = 'Trip Planner';
    }
    if (dashGreetingName) dashGreetingName.textContent = firstName;
    if (dashProfileAvatar) dashProfileAvatar.textContent = user.avatarText || 'TR';
    if (dashProfileName) dashProfileName.textContent = user.name;
    if (dashProfileEmail) dashProfileEmail.textContent = user.email || 'traveler@wayfind.travel';
    if (profileAvatar) profileAvatar.textContent = user.avatarText || 'TR';
    if (profileName) profileName.textContent = user.name;
    if (profileEmail) profileEmail.textContent = user.email || 'traveler@wayfind.travel';
  } else {
    if (headerAuthBtnText) {
      headerAuthBtnText.textContent = 'Sign In';
    }
    if (headerAuthBtn) {
      headerAuthBtn.title = 'Sign In to Wayfind';
      headerAuthBtn.onclick = (e) => {
        e.preventDefault();
        openModal('signInModal');
      };
    }
    if (headerGetStartedBtn) {
      headerGetStartedBtn.title = 'Sign Up to Start Planning';
    }
    if (dashGreetingName) dashGreetingName.textContent = 'Traveler';
    if (dashProfileAvatar) dashProfileAvatar.textContent = 'GT';
    if (dashProfileName) dashProfileName.textContent = 'Guest Traveler';
    if (dashProfileEmail) dashProfileEmail.textContent = 'guest@wayfind.travel';
    if (profileAvatar) profileAvatar.textContent = 'GT';
    if (profileName) profileName.textContent = 'Guest Traveler';
    if (profileEmail) profileEmail.textContent = 'guest@wayfind.travel';
  }
}
