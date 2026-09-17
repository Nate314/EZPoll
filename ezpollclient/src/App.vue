<template>
  <div class="app">
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

export default {
  name: 'App',
  components: {
    Footer
  },
  mounted() {
    fetch('config.json').then(x => x.json()).then(x => localStorage.setItem('api_url', x.api_url));
    const user_guid = localStorage.getItem('user_guid');
    if (user_guid) {
      ezpollapi.getUser(user_guid, response => console.log(response));
    } else {
      ezpollapi.getUser('new', response => localStorage.setItem('user_guid', response.UserGUID));
    }
  }
}
</script>

<style>
:root {
  /* Color palette */
  --color-primary: #6366f1;
  --color-primary-dark: #4f46e5;
  --color-primary-light: #818cf8;
  --color-accent: #06b6d4;
  --color-bg-start: #eef2ff;
  --color-bg-end: #e0f2fe;
  --color-surface: #ffffff;
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
  height: calc(100vh - 25px);
  overflow: hidden;
}

.router-view {
  width: 100vw;
  height: calc(100vh - 25px);
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
