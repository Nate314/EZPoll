<template>
  <div>
    <h1 v-if="!loading">
      404
    </h1>
    <h1 v-if="loading">
      <span>loading</span>
      <span v-for="i in dots" :key="i"> .</span>
    </h1>
  </div>
</template>

<script>
import * as ezpollapi from '../services/ezpoll.service';

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
    waitForLocalStorageItem: function(lskey, callback) {
      const interval = setInterval(() => {
        if (localStorage.getItem(lskey)) {
          clearInterval(interval);
          callback ? callback() : undefined;
        }
      }, 100);
    },
    routeBasedOnLocalStorage: function() {
      setTimeout(() => {
        const api_url = localStorage.getItem('api_url');
        const user_guid = localStorage.getItem('user_guid');
        const session_guid = localStorage.getItem('session_guid');
        if (!api_url || !user_guid || !session_guid) {
          this.$router.push('home');
        } else {
          this.$router.push('question');
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
    if (route.length == 2 && route[1].length === 36) {
      const candidate_session_guid = route[1];
      this.waitForLocalStorageItem('api_url', () => {
        ezpollapi.getSession(candidate_session_guid, response => {
          if (response && response.SessionGUID) {
            localStorage.setItem('session_guid', candidate_session_guid);
          } else {
            localStorage.removeItem('session_guid');
          }
          this.waitForLocalStorageItem('user_guid', () => {
            this.routeBasedOnLocalStorage();
          });
        });
      });
    } else if (path === '/') {
      localStorage.removeItem('session_guid');
      this.routeBasedOnLocalStorage();
    } else {
      this.routeBasedOnLocalStorage();
    }
  },
  beforeDestroy() {
    clearInterval(this.dotsinterval);
  }
}
</script>

<style scoped>
</style>
