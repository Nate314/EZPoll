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
.app {
  width: 99vw;
  height: calc(100vh - 25px);
  overflow: hidden;
}
.router-view {
  width: 99vw;
  height: calc(100vh - 25px);
  overflow-y: scroll;
}
.router-view::-webkit-scrollbar {
    width: 10px;
}
.router-view::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0);
}
.router-view::-webkit-scrollbar-thumb {
    background: #23232e;
}
</style>
