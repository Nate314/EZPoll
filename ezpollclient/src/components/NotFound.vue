<template>
  <h1>
    404
  </h1>
</template>

<script>
export default {
  name: 'NotFound',
  mounted() {
    const route = this.$route.fullPath.split('/');
    if (route.length == 2 && route[1].length === 36) {
      const candidate_session_guid = route[1];
      fetch(`${localStorage.getItem('api_url')}/session/${candidate_session_guid}`).then(x => x.json())
        .then(response => {
            console.log('-----session info-----');
            if (response.SessionGUID) {
              localStorage.setItem('session_guid', candidate_session_guid);
            } else {
              localStorage.removeItem('session_guid');
            }
            this.routeBasedOnLocalStorage();
          });
    } else {
      this.routeBasedOnLocalStorage();
    }
  },
  methods: {
    routeBasedOnLocalStorage() {
      const api_url = localStorage.getItem('api_url');
      const user_guid = localStorage.getItem('user_guid');
      const session_guid = localStorage.getItem('session_guid');
      if (!api_url || !user_guid || !session_guid) {
        this.$router.push('home');
      } else {
        this.$router.push('question');
      }
    }
  }
}
</script>

<style scoped>
</style>
