<template>
  <div class="notfound-view">
    <div class="card">
      <h1 v-if="!loading">
        404
      </h1>
      <h1 v-if="loading">
        <span>loading</span>
        <span v-for="i in dots" :key="i"> .</span>
      </h1>
    </div>
  </div>
</template>

<script>
import * as ezpollapi from '../services/ezpoll.service';

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default {
  name: 'NotFound',
  data() {
    return {
      dotsinterval: null,
      dots: [],
      loading: true
    }
  },
  methods: {
    waitForSessionStorageItem: function(sskey, callback) {
      const interval = setInterval(() => {
        if (sessionStorage.getItem(sskey)) {
          clearInterval(interval);
          callback ? callback() : undefined;
        }
      }, 100);
    },
    routeBasedOnSessionStorage: function() {
      setTimeout(() => {
        const api_url = sessionStorage.getItem('api_url');
        const user_guid = sessionStorage.getItem('user_guid');
        const session_guid = sessionStorage.getItem('session_guid');
        if (!api_url || !user_guid || !session_guid) {
          this.$router.push('/home');
        } else {
          this.$router.push('/question');
        }
      }, 1000);
    }
  },
  mounted() {
    this.dotsinterval = setInterval(() => {
      this.dots = Array((this.dots.length + 1) % 4).fill(null);
    }, 250);
    const path = this.$route.fullPath;
    console.log(path);
    const route = path.split('/');
    if (route.length == 2 && GUID_PATTERN.test(route[1])) {
      const candidate_session_guid = route[1];
      this.waitForSessionStorageItem('api_url', () => {
        ezpollapi.getSession(candidate_session_guid, response => {
          if (response && response.SessionGUID) {
            sessionStorage.setItem('session_guid', candidate_session_guid);
          } else {
            sessionStorage.removeItem('session_guid');
          }
          this.waitForSessionStorageItem('user_guid', () => {
            this.routeBasedOnSessionStorage();
          });
        });
      });
    } else if (path === '/') {
      sessionStorage.removeItem('session_guid');
      sessionStorage.removeItem('user_guid');
      this.routeBasedOnSessionStorage();
    } else {
      this.routeBasedOnSessionStorage();
    }
  },
  beforeUnmount() {
    clearInterval(this.dotsinterval);
  }
}
</script>

<style scoped>
.notfound-view {
  display: flex;
  justify-content: center;
}
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-lg);
  width: 100%;
  max-width: 320px;
}
</style>
