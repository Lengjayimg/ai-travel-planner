/**
 * WAYFIND REACTIVE STATE STORE
 * Manages view routing, user session, current trip editing, theme state, and modals.
 */

class WayfindStore {
  constructor() {
    this.state = {
      currentView: 'landing', // 'landing', 'dashboard', 'planner', 'generating', 'itinerary', 'saved-trips', 'profile'
      theme: localStorage.getItem('wayfind_theme') || 'light',
      isCustomizing: false,
      activeDayIndex: 0,
      currency: localStorage.getItem('wayfind_currency') || 'NGN',
      isHighContrast: localStorage.getItem('wayfind_accessibility') === 'true',
      exchangeRateUSDToNGN: 1550,
      
      // User Profile (Persona: Anabel / Adaeze Jones)
      user: {
        name: 'Anabel Jones',
        handle: '@anabeltravels',
        email: 'anabel.jones@travel.ng',
        avatarText: 'AJ',
        avatarUrl: localStorage.getItem('wayfind_avatar') || null,
        location: 'Lagos, Nigeria',
        tripsCount: 4,
        isLoggedIn: true
      },

      // Working Trip (Deep copy of Abuja Initial Trip for real-time mutations)
      currentTrip: JSON.parse(JSON.stringify(WAYFIND_DATA.initialTrip)),
      savedTrips: JSON.parse(JSON.stringify(WAYFIND_DATA.savedTrips)),
      
      // Modals
      activeModal: null, // 'signIn', 'signUp', 'saveSuccess', 'shareSheet', 'qrCode', 'addActivity'
      
      // Chatbot History
      isChatbotOpen: false,
      chatMessages: [
        {
          sender: 'ai',
          text: "Welcome to Abuja! I'm your **Wayfind AI Travel Companion**. I've optimized your 4-day plan from Jabi Lake to Gurara Falls. What would you like to explore or adjust?",
          time: '2:30 PM'
        }
      ]
    };

    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setView(viewName) {
    this.state.currentView = viewName;
    this.notify();
  }

  setUser(supabaseUser) {
    if (supabaseUser) {
      const metadata = supabaseUser.user_metadata || {};
      const fullName = metadata.full_name || supabaseUser.email.split('@')[0];
      const initials = fullName
        .split(' ')
        .filter(Boolean)
        .map(n => n[0].toUpperCase())
        .slice(0, 2)
        .join('') || 'TR';

      this.state.user = {
        id: supabaseUser.id,
        name: fullName,
        handle: '@' + (supabaseUser.email.split('@')[0] || 'traveler'),
        email: supabaseUser.email,
        avatarText: initials,
        avatarUrl: metadata.avatar_url || localStorage.getItem('wayfind_avatar') || null,
        location: metadata.location || 'Nigeria',
        tripsCount: this.state.savedTrips.length,
        isLoggedIn: true
      };
    } else {
      this.state.user = {
        name: 'Guest Traveler',
        handle: '@guest',
        email: '',
        avatarText: 'GT',
        avatarUrl: null,
        location: 'Explorer',
        tripsCount: 0,
        isLoggedIn: false
      };
    }
    this.notify();
  }

  mergeProfileData(profile) {
    if (!profile || !this.state.user.isLoggedIn) return;
    if (profile.full_name) {
      this.state.user.name = profile.full_name;
      this.state.user.avatarText = profile.full_name
        .split(' ')
        .filter(Boolean)
        .map(n => n[0].toUpperCase())
        .slice(0, 2)
        .join('') || 'TR';
    }
    if (profile.avatar_url) {
      this.state.user.avatarUrl = profile.avatar_url;
      localStorage.setItem('wayfind_avatar', profile.avatar_url);
    }
    if (profile.location) this.state.user.location = profile.location;
    if (profile.travel_style) this.state.user.travelStyle = profile.travel_style;
    this.notify();
  }

  setCurrency(currencyCode) {
    if (window.WAYFIND_CURRENCIES && window.WAYFIND_CURRENCIES[currencyCode]) {
      this.state.currency = currencyCode;
      localStorage.setItem('wayfind_currency', currencyCode);
      this.notify();
      if (typeof showToast === 'function') {
        showToast(`Display currency set to ${currencyCode}`, 'ph-currency-circle-dollar');
      }
    }
  }

  setAccessibility(enabled) {
    this.state.isHighContrast = !!enabled;
    localStorage.setItem('wayfind_accessibility', enabled ? 'true' : 'false');
    if (enabled) {
      document.documentElement.classList.add('high-contrast-mode');
      document.documentElement.setAttribute('data-contrast', 'high');
      if (typeof showToast === 'function') {
        showToast('High-Contrast & Large Touch Targets activated.', 'ph-eye');
      }
    } else {
      document.documentElement.classList.remove('high-contrast-mode');
      document.documentElement.removeAttribute('data-contrast');
      if (typeof showToast === 'function') {
        showToast('Standard visual mode restored.', 'ph-eye');
      }
    }
    this.notify();
  }

  updateAvatar(avatarUrl) {
    if (!this.state.user) return;
    this.state.user.avatarUrl = avatarUrl;
    if (avatarUrl) {
      localStorage.setItem('wayfind_avatar', avatarUrl);
    } else {
      localStorage.removeItem('wayfind_avatar');
    }
    this.notify();
  }

  setTheme(theme) {
    this.state.theme = theme;
    localStorage.setItem('wayfind_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.notify();
  }

  toggleTheme() {
    this.setTheme(this.state.theme === 'light' ? 'dark' : 'light');
  }

  setDayIndex(index) {
    this.state.activeDayIndex = index;
    this.notify();
  }

  toggleCustomizing() {
    this.state.isCustomizing = !this.state.isCustomizing;
    this.notify();
  }

  toggleCurrency() {
    this.state.currency = this.state.currency === 'NGN' ? 'USD' : 'NGN';
    this.notify();
  }

  openModal(modalName) {
    this.state.activeModal = modalName;
    this.notify();
  }

  closeModal() {
    this.state.activeModal = null;
    this.notify();
  }

  toggleChatbot() {
    this.state.isChatbotOpen = !this.state.isChatbotOpen;
    this.notify();
  }

  addChatMessage(sender, text) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.state.chatMessages.push({ sender, text, time: timeStr });
    this.notify();
  }

  // --- Itinerary Mutations ---
  deleteActivity(dayIndex, activityId) {
    const day = this.state.currentTrip.days[dayIndex];
    if (day) {
      day.activities = day.activities.filter(a => a.id !== activityId);
      this.recalculateBudget();
      this.notify();
    }
  }

  addActivity(dayIndex, newActivity) {
    const day = this.state.currentTrip.days[dayIndex];
    if (day) {
      day.activities.push(newActivity);
      // Sort roughly by time string
      this.recalculateBudget();
      this.notify();
    }
  }

  swapActivity(dayIndex, activityId) {
    const day = this.state.currentTrip.days[dayIndex];
    if (!day) return;
    const act = day.activities.find(a => a.id === activityId);
    if (act) {
      if (act.title.includes("Kayaking")) {
        act.title = "Sunset Catamaran Cruise & Chill at Jabi Lake";
        act.notes = "Relaxed group cruise with tropical drinks and acoustic music.";
        act.aiBadge = "AI Alternative Swapped";
      } else if (act.title.includes("Thought Pyramid")) {
        act.title = "Bature Cultural Lounge & Art Exhibition";
        act.notes = "Indie gallery pop-up with local artisanal craft tasting.";
        act.aiBadge = "AI Alternative Swapped";
      } else {
        act.title = "Curated Scenic Viewpoint & Coffee Stop";
        act.notes = "Special panoramic break suggested by Wayfind companion.";
        act.aiBadge = "AI Alternative Swapped";
      }
      this.notify();
    }
  }

  recalculateBudget() {
    let totalNGN = 0;
    for (const day of this.state.currentTrip.days) {
      for (const act of day.activities) {
        totalNGN += (act.costNGN || 0);
      }
    }
    this.state.currentTrip.budgetTotalNGN = totalNGN;
    this.state.currentTrip.budgetTotalUSD = Math.round(totalNGN / 850);
  }

  saveCurrentTrip() {
    const exists = this.state.savedTrips.find(t => t.id === this.state.currentTrip.id);
    if (!exists) {
      this.state.savedTrips.unshift({
        id: this.state.currentTrip.id,
        title: this.state.currentTrip.title,
        destination: this.state.currentTrip.destination,
        dates: this.state.currentTrip.dates,
        duration: this.state.currentTrip.duration,
        travelers: this.state.currentTrip.travelers,
        travelStyle: this.state.currentTrip.travelStyle,
        budgetTotalUSD: this.state.currentTrip.budgetTotalUSD,
        budgetTotalNGN: this.state.currentTrip.budgetTotalNGN,
        status: "Active Itinerary",
        coverImage: this.state.currentTrip.coverImage
      });
    }
    this.notify();
  }
}

const store = new WayfindStore();
