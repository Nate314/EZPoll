import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import CreateQuestion from './components/CreateQuestion.vue';
import Home from './components/Home.vue';
import Question from './components/Question.vue';
import NotFound from './components/NotFound.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/createquestion', component: CreateQuestion },
    { path: '/home', component: Home },
    { path: '/question', component: Question },
    { path: '/notfound', component: NotFound },
    { path: '/:pathMatch(.*)*', component: NotFound }
  ]
});

// Fetch runtime config (currently just api_url) and stash it in
// sessionStorage BEFORE the app tree is created. Lifecycle hooks (created/
// mounted) for App and its children only start running once the app is
// mounted, so waiting here guarantees api_url is already present in
// sessionStorage the first time anything (including the lazily-created
// socket.io connection in ezpoll.service.js) reads it.
fetch('config.json')
  .then(x => x.json())
  .then(config => {
    sessionStorage.setItem('api_url', config.api_url);
    createApp(App).use(router).mount('#app');
  });
