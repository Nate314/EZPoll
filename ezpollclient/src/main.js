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
    {path: '*', component: NotFound}
  ],
  mode: 'history'
});

new Vue({
  router,
  render: h => h(App),
}).$mount('#app');
