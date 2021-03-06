import VueRouter from 'vue-router';
import Vue from 'vue';
import Vuex from 'vuex';

import Cookies from 'cookies-js';
import RecipeList from './components/RecipeList.vue';
import Recipe from './components/Recipe.vue';
import AddRecipe from './components/AddRecipe.vue';
import EditRecipe from './components/EditRecipe.vue';
import App from './components/App.vue';

import API from './models/API';

import User from './models/User';

import { Metadata, setMetadata } from "./metadata";
import PageData from './models/PageData';

export default async function (config): Promise<void> {
  API.init(config.APIPrefix);

  Vue.use(VueRouter);
  Vue.use(Vuex);

  const router = new VueRouter({
    mode: 'history',
    routes: [
      {
        path: '/', name: 'list', component: RecipeList, props: true,
      },
      {
        path: '/recipe/:recipeID/edit', name: 'editRecipe', component: EditRecipe, props: true,
      },
      { path: '/recipe/add', name: 'addRecipe', component: AddRecipe },
      {
        path: '/recipe/:recipeID', name: 'recipe', component: Recipe, props: true,
      },
      {
        path: '/drafts', name: 'drafts', component: RecipeList, props: { draftList: true }
      }
    ],
    base: config.PathPrefix,
  });

  const sessionId = Cookies.get('token');
  let user = null;
  if (sessionId) {
    API.getInstance().setToken(sessionId);
    user = await User.getLoggedInUser();
  }

  Vue.filter('round', (value, decimals) => Math.round(value * (10 ** decimals)) / (10 ** decimals));
  Vue.filter('formatDate', (date) => date.toLocaleDateString());


  Vue.prototype.$pageTitle = config.PageTitle;
  document.title = config.PageTitle;

  const pagedata: PageData = await PageData.getPageData();


  const store = new Vuex.Store({
    state: {
      user: user == null ? {} : user,
      isLoggedIn: user != null,
      pageTitle: config.PageTitle,
      metadata: new Metadata(),
      pagedata: pagedata
    },
    mutations: {
      setUser(state, newUser): void {
        state.user = { ...state.user, ...newUser };
        state.isLoggedIn = 'ID' in newUser;
      },
      setMetadata(state, metadata: Metadata): void {
        state.metadata = metadata;
        setMetadata(state.pageTitle, metadata);
      }
    },
  });

  const page = new Vue({
    router,
    store,
    render: (createElement) => createElement(App),
  });

  page.$mount('#app');
}
