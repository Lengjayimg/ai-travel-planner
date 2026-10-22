/**
 * WAYFIND SUPABASE AUTHENTICATION SERVICE
 * Manages user sign up, sign in, sign out, password reset, and session state.
 */

const SUPABASE_CONFIG = {
  url: 'https://idmpjwzizilauidmcrwr.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkbXBqd3ppemlsYXVpZG1jcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTAyODcsImV4cCI6MjEwODI2NjI4N30.UII-6AAxyGvWIVkRCbLM5jYojMc5iX1X51OjVbvPxS0'
};

// Initialize the Supabase client
let supabaseClient = null;
if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

const authService = {
  client: supabaseClient,

  /**
   * Register a new user with full name, email, and password
   */
  async signUp(fullName, email, password) {
    if (!supabaseClient) {
      throw new Error('Supabase client failed to load.');
    }
    const { data, error } = await supabaseClient.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          full_name: fullName.trim()
        }
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Authenticate an existing user with email and password
   */
  async signIn(email, password) {
    if (!supabaseClient) {
      throw new Error('Supabase client failed to load.');
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (error) throw error;
    return data;
  },

  /**
   * Log out the active session
   */
  async signOut() {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error('Sign out error:', error.message);
    }
    if (window.store) {
      window.store.setUser(null);
    }
    if (typeof showToast === 'function') {
      showToast('Logged out successfully.', 'ph-sign-out');
    }
  },

  /**
   * Send a password reset email
   */
  async resetPassword(email) {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '#profile'
    });
    if (error) throw error;
    return data;
  },

  /**
   * Get the active session user
   */
  async getUser() {
    if (!supabaseClient) return null;
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  },

  /**
   * Listen to auth state transitions and keep application store in sync
   */
  init(store) {
    if (!supabaseClient) return;

    // Check existing session on boot
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && store) {
        store.setUser(session.user);
      }
    });

    // Subscribe to state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED)
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session?.user && store) {
        store.setUser(session.user);
      } else if (store) {
        store.setUser(null);
      }
    });
  }
};

window.authService = authService;
