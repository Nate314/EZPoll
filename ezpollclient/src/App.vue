<template>
  <div id="app">
    <ul>
      <li><router-link to="/createquestion">CreateQuestion</router-link></li>
      <li><router-link to="/home">Home</router-link></li>
      <li><router-link to="/session/some_session_id">Question</router-link></li>
    </ul>
    <router-view></router-view>
    <footer v-if="session_id">Session ID: {{session_id}}</footer>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      session_id: ''
    }
  },
  mounted() {
    localStorage.setItem('api_url', 'http://localhost:5000/api');
    setInterval(() => this.session_id = localStorage.getItem('session_id'));
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
footer {
  position: absolute;
  bottom: 0;
}
</style>
