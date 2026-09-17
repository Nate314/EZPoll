<template>
  <div class="app">
    <header class="app-header">
      <span class="app-title">EZPoll</span>
      <button
        class="theme-toggle"
        type="button"
        v-on:click="toggleTheme"
        :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
      >{{ theme === 'dark' ? '☀️' : '🌙' }}</button>
    </header>
    <div class="router-view">
      <router-view></router-view>
      <br />
    </div>
    <Footer />
  </div>
</template>

<script>
import * as ezpollapi from './services/ezpoll.service';
import Footer from './components/Footer';

const THEME_STORAGE_KEY = 'theme';

export default {
  name: 'App',
  components: {
    Footer
  },
  data() {
    return {
      theme: 'light'
    };
  },
  methods: {
    applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      this.theme = theme;
    },
    getSystemTheme() {
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : 'light';
    },
    toggleTheme() {
      const next = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_STORAGE_KEY, next);
      this.applyTheme(next);
    },
    initTheme() {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        this.applyTheme(stored);
        return;
      }
      this.applyTheme(this.getSystemTheme());
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = event => {
          // Only follow system changes while the user hasn't made an explicit choice.
          if (!localStorage.getItem(THEME_STORAGE_KEY)) {
            this.applyTheme(event.matches ? 'dark' : 'light');
          }
        };
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', listener);
        } else if (mediaQuery.addListener) {
          mediaQuery.addListener(listener);
        }
      }
    }
  },
  mounted() {
    this.initTheme();
    // api_url is already in sessionStorage by the time this runs - it's
    // fetched and set in main.js before the Vue app is mounted at all.
    const user_guid = sessionStorage.getItem('user_guid');
    if (user_guid) {
      ezpollapi.getUser(user_guid, response => console.log(response));
    } else {
      ezpollapi.getUser('new', response => sessionStorage.setItem('user_guid', response.UserGUID));
    }
  }
}
</script>

<style>
:root {
  /* Color palette (light, default) */
  --color-primary: #6366f1;
  --color-primary-dark: #4f46e5;
  --color-primary-light: #818cf8;
  --color-accent: #06b6d4;
  --color-bg-start: #eef2ff;
  --color-bg-end: #e0f2fe;
  --color-surface: #ffffff;
  --color-chrome-bg: rgba(255, 255, 255, 0.85);
  --color-text: #1e293b;
  --color-text-muted: #64748b;
  --color-border: #e2e8f0;
  --color-danger: #ef4444;

  /* Spacing */
  --space-xs: 0.5rem;
  --space-sm: 0.75rem;
  --space-md: 1.25rem;
  --space-lg: 2rem;

  /* Shape */
  --radius-sm: 8px;
  --radius-md: 14px;
  --shadow-card: 0 4px 16px rgba(30, 41, 59, 0.08), 0 1px 3px rgba(30, 41, 59, 0.06);
  --shadow-card-hover: 0 8px 24px rgba(30, 41, 59, 0.12), 0 2px 6px rgba(30, 41, 59, 0.08);
}

/* Dark palette values, shared by the system-preference fallback and the
   explicit override below. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-primary: #818cf8;
    --color-primary-dark: #6366f1;
    --color-primary-light: #a5b4fc;
    --color-accent: #22d3ee;
    --color-bg-start: #0f172a;
    --color-bg-end: #1e293b;
    --color-surface: #1e293b;
    --color-chrome-bg: rgba(15, 23, 42, 0.85);
    --color-text: #e2e8f0;
    --color-text-muted: #94a3b8;
    --color-border: #334155;
    --color-danger: #f87171;
    --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.25);
    --shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3);
  }
}

/* Explicit user override, set via the toggle and persisted in localStorage. */
:root[data-theme="dark"] {
  --color-primary: #818cf8;
  --color-primary-dark: #6366f1;
  --color-primary-light: #a5b4fc;
  --color-accent: #22d3ee;
  --color-bg-start: #0f172a;
  --color-bg-end: #1e293b;
  --color-surface: #1e293b;
  --color-chrome-bg: rgba(15, 23, 42, 0.85);
  --color-text: #e2e8f0;
  --color-text-muted: #94a3b8;
  --color-border: #334155;
  --color-danger: #f87171;
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.25);
  --shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3);
}

* {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

body {
  margin: 0;
  text-align: center;
}

html {
  height: 100vh;
  background-size: cover;
  background-repeat: no-repeat;
  background: linear-gradient(135deg, var(--color-bg-start), var(--color-bg-end));
  color: var(--color-text);
  color-scheme: light dark;
  transition: background-color 0.2s ease, color 0.2s ease;
}

button {
  min-width: 240px;
  width: 90%;
  max-width: 400px;
  height: 50px;
  font-size: 1.15rem;
  font-weight: 600;
  margin-top: 15px;
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.32);
}
button:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
}
button:focus-visible {
  outline: 3px solid var(--color-primary-light);
  outline-offset: 2px;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

input {
  width: 90%;
  max-width: 400px;
  height: 50px;
  margin-bottom: 15px;
  padding: 0 var(--space-md);
  font-size: 1.15rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

h1 {
  color: var(--color-text);
  font-weight: 700;
  margin: var(--space-lg) var(--space-md) var(--space-md);
}

h3 {
  color: var(--color-text-muted);
  font-weight: 500;
}

.app {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-chrome-bg);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--color-border);
}

.app-title {
  font-weight: 700;
  color: var(--color-text);
  font-size: 1.1rem;
}

.theme-toggle {
  min-width: unset;
  width: 44px;
  height: 44px;
  margin: 0;
  padding: 0;
  font-size: 1.2rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  box-shadow: none;
}

.router-view {
  width: 100vw;
  flex: 1 1 auto;
  overflow-y: auto;
  padding: var(--space-lg) var(--space-md) 4rem;
}

.router-view::-webkit-scrollbar {
    width: 10px;
}
.router-view::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0);
}
.router-view::-webkit-scrollbar-thumb {
    background: var(--color-primary-light);
    border-radius: 10px;
}

@media (max-width: 480px) {
  button, input {
    width: 100%;
    max-width: 100%;
  }
  .router-view {
    padding: var(--space-md) var(--space-sm) 4rem;
  }
}
</style>
