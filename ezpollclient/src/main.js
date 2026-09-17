import Vue from 'vue';
import App from './App.vue';
import VueRouter from 'vue-router';
import CreateQuestion from './components/CreateQuestion';
import Home from './components/Home';
import Question from './components/Question';
import NotFound from './components/NotFound';

Vue.use(VueRouter);

Vue.config.productionTip = false;

const router = new VueRouter({
  routes: [
    {path: '/createquestion', component: CreateQuestion},
    {path: '/home', component: Home},
    {path: '/question', component: Question},
    {path: '/notfound', component: NotFound},
    {path: '*', component: NotFound}
  ],
  mode: 'history'
});

// Fetch runtime config (currently just api_url) and stash it in
// sessionStorage BEFORE the app tree is created. Vue lifecycle hooks
// (created/mounted) for App and its children only start running once
// $mount() is called, so waiting here guarantees api_url is already
// present in sessionStorage the first time anything (including the
// lazily-created socket.io connection in ezpoll.service.js) reads it -
// closing the race that caused the first-load socket.io 405s on a brand
// new tab/session.
fetch('config.json')
  .then(x => x.json())
  .then(config => {
    sessionStorage.setItem('api_url', config.api_url);
    new Vue({
      router,
      render: h => h(App),
    }).$mount('#app');
  });
