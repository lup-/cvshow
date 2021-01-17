import Vue from 'vue';
import VueRouter from 'vue-router';
import store from "../store";

import Home from '../components/Home';
import CvList from '../components/Cv/List';
import CvEdit from '../components/Cv/Edit';
import CvShow from '../components/Cv/Show';
import Login from '../components/Users/Login';
import UsersEdit from '../components/Users/Edit';
import UsersList from '../components/Users/List';

Vue.use(VueRouter);

const routes = [
    { name: 'Home', path: '/', meta: {title: 'ЁжSearch', requiresAuth: true, group: 'home'}, component: Home },
    { name: 'login', path: '/login', component: Login },
    { name: 'cvList', path: '/cv/list', meta: {title: 'ЁжSearch - Список резюме', requiresAuth: true, group: 'cvList'}, component: CvList },
    { name: 'cvEdit', path: '/cv/edit/:id', meta: {title: 'ЁжSearch - Редактирование резюме', requiresAuth: true, group: 'cvList'}, component: CvEdit },
    { name: 'cvNew', path: '/cv/new',  meta: {title: 'ЁжSearch - Новое резюме', requiresAuth: true, group: 'cvList'}, component: CvEdit },
    { name: 'userList', path: '/users/', component: UsersList, meta: {requiresAuth: true, group: 'userList'} },
    { name: 'userNew', path: '/users/new', component: UsersEdit, meta: {requiresAuth: true, group: 'userList'} },
    { name: 'userEdit', path: '/users/:id', component: UsersEdit, meta: {requiresAuth: true, group: 'userList'} },

    { path: '/:slug', name: 'Show', meta: {title: 'ЁжSearch', requiresAuth: false, group: 'Show'}, component: CvShow },
]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
});

router.beforeEach(async (to, from, next) => {
    if (to.matched.some(record => record.meta.requiresAuth)) {
        await store.dispatch('loginLocalUser');
        let isNotLoggedIn = !store.getters.isLoggedIn;
        let loginTo = {
            path: '/login',
            query: { redirect: to.fullPath }
        };

        if (isNotLoggedIn) {
            next(loginTo);
        }
        else {
            let routeGroup = to.matched && to.matched[0] ? to.matched[0].meta.group : false;

            if (routeGroup && store.getters.userHasRights(routeGroup)) {
                next();
            }
            else {
                store.commit('setErrorMessage', 'Не достаточно прав!');
                next(loginTo);
            }
        }
    }
    else {
        next();
    }
})

export {router, store};

