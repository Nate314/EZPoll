<template>
  <div id="app">
    <router-view></router-view>
    <Footer />
  </div>
</template>

<script>
import Footer from './components/Footer';

export default {
  name: 'App',
  components: {
    Footer
  },
  mounted() {
    localStorage.setItem('api_url', 'http://pi.nathangawith.com:575/api');
    const user_guid = localStorage.getItem('user_guid');
    if (user_guid) {
      fetch(`${localStorage.getItem('api_url')}/user/${user_guid}`).then(x => x.json())
        .then(response => console.log(response));
    } else {
      fetch(`${localStorage.getItem('api_url')}/user/new`).then(x => x.json())
        .then(response => localStorage.setItem('user_guid', response.UserGUID));
    }
  }
}
</script>

<style>
* {
  font-family: 'Trebuchet MS';
  text-align: center;
}
html {
  height: 100vh;
  background-size: cover;
  background-repeat:no-repeat;
  background: linear-gradient(to left top, #55FFFF, #5555FF);
}
button {
    width: 400px;
    height: 50px;
    font-size: 2rem;
    margin-top: 15px;
}
input {
    width: 400px;
    height: 50px;
    margin-bottom: 15px;
    font-size: 2rem;
}
h1 {
  color: white;
}
</style>
