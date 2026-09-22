/* ============================================================
   AURA / AKSHAY — Client-Side Authentication & Profile Manager
   Manages user registration, sign-in, session persistence, and
   personalization attributes. Everything is persisted in localStorage.
   ============================================================ */

export const AUTH_USER_KEY = 'aura_auth_user_v1';
export const AUTH_USERS_DB_KEY = 'aura_users_db_v1';

/** Simple deterministic string hash for local client-side password storage */
async function hashPassword(password) {
  try {
    const msgBuffer = new TextEncoder().encode(password + ':aura_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback if crypto.subtle is unavailable in some local contexts
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = ((hash << 5) - hash) + password.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }
}

function getStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_DB_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(AUTH_USERS_DB_KEY, JSON.stringify(users));
  } catch {
    /* storage full or private mode */
  }
}

export class AuthManager {
  constructor() {
    this.currentUser = this._loadSession();
    this.listeners = new Set();
  }

  _loadSession() {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _saveSession(user) {
    this.currentUser = user;
    try {
      if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } catch {
      /* private mode */
    }
    this._notify();
  }

  _notify() {
    for (const cb of this.listeners) {
      try { cb(this.currentUser); } catch (e) { console.error(e); }
    }
  }

  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getUser() {
    return this.currentUser;
  }

  getFirstName() {
    if (!this.currentUser || !this.currentUser.name) return 'Friend';
    return this.currentUser.name.trim().split(/\s+/)[0];
  }

  getInitials() {
    if (!this.currentUser || !this.currentUser.name) return 'U';
    const parts = this.currentUser.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  async signUp({ name, email, password, targetRole = 'Software Engineer' }) {
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();
    const cleanRole = String(targetRole || 'Software Engineer').trim();

    if (!cleanName) throw new Error('Please enter your name for personalization.');
    if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Please enter a valid email address.');
    if (!cleanPass || cleanPass.length < 4) throw new Error('Password must be at least 4 characters.');

    const users = getStoredUsers();
    const existingIndex = users.findIndex((u) => u.email === cleanEmail);
    const passwordHash = await hashPassword(cleanPass);
    const firstName = cleanName.split(/\s+/)[0];

    if (existingIndex !== -1) {
      // Re-signing up with existing email: update profile smoothly without getting stuck
      const existing = users[existingIndex];
      existing.name = cleanName;
      existing.firstName = firstName;
      existing.targetRole = cleanRole || existing.targetRole || 'Software Engineer';
      existing.passwordHash = passwordHash;
      existing.lastLogin = new Date().toISOString();
      users[existingIndex] = existing;
      saveUsers(users);

      const safeUser = { ...existing };
      delete safeUser.passwordHash;
      this._saveSession(safeUser);
      return safeUser;
    }

    const newUser = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: cleanName,
      firstName,
      email: cleanEmail,
      passwordHash,
      targetRole: cleanRole || 'Software Engineer',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    const safeUser = { ...newUser };
    delete safeUser.passwordHash;
    this._saveSession(safeUser);
    return safeUser;
  }

  async signIn({ email, password }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    if (!cleanEmail || !cleanPass) throw new Error('Please provide both email and password.');

    const users = getStoredUsers();
    const user = users.find((u) => u.email === cleanEmail);
    if (!user) throw new Error('No account found with this email. Please sign up.');

    const passwordHash = await hashPassword(cleanPass);
    if (user.passwordHash !== passwordHash) {
      throw new Error('Incorrect password. Please try again.');
    }

    user.lastLogin = new Date().toISOString();
    saveUsers(users);

    const safeUser = { ...user };
    delete safeUser.passwordHash;
    this._saveSession(safeUser);
    return safeUser;
  }

  signOut() {
    this._saveSession(null);
  }

  async updateProfile({ name, targetRole }) {
    if (!this.currentUser) throw new Error('Not logged in.');
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === this.currentUser.id);
    if (idx !== -1) {
      if (name) users[idx].name = name.trim();
      if (name) users[idx].firstName = name.trim().split(/\s+/)[0];
      if (targetRole) users[idx].targetRole = targetRole.trim();
      saveUsers(users);
      const safeUser = { ...users[idx] };
      delete safeUser.passwordHash;
      this._saveSession(safeUser);
      return safeUser;
    } else {
      // In case user was demo or session only
      const updated = {
        ...this.currentUser,
        name: name ? name.trim() : this.currentUser.name,
        firstName: name ? name.trim().split(/\s+/)[0] : this.currentUser.firstName,
        targetRole: targetRole ? targetRole.trim() : this.currentUser.targetRole
      };
      this._saveSession(updated);
      return updated;
    }
  }

  signInAsDemo(preset = 'Abhay') {
    const demoUser = {
      id: 'demo_user_1',
      name: preset,
      firstName: preset.split(/\s+/)[0],
      email: `${preset.toLowerCase().replace(/\s+/g, '')}@example.com`,
      targetRole: 'Staff Full-Stack Engineer',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isDemo: true,
    };
    this._saveSession(demoUser);
    return demoUser;
  }
}

export const auth = new AuthManager();
