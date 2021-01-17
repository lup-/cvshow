import axios from "axios";

export default {
    state: {
        list: [],
        all: [],
        categories: [],
        current: false,
        currentFilter: {}
    },
    getters: {
        vacancies(state) {
            return state.all.map(cv => cv.vacancy).filter((vacancy, index, all) => vacancy && vacancy.length > 0 && all.indexOf(vacancy) === index);
        }
    },
    actions: {
        async loadCvs({commit}, filter = {}) {
            let response = await axios.post(`/api/cv/list`, {});
            commit('setAllCvs', response.data.cvs);

            response = await axios.post(`/api/cv/list`, {filter});
            await commit('setFilter', filter);
            return commit('setCvs', response.data.cvs);
        },
        async loadCvBySlug({commit}, slug) {
            let response = await axios.post(`/api/cv/get`, {slug});
            if (response && response.data) {
                commit('setCurrentCv', response.data.cv);
            }
        },
        async setCurrentCv({commit, state}, cvId) {
            let cv = state.list.find(item => item.id === cvId);
            if (cv) {
                commit('setCurrentCv', cv);
            }
        },
        async setCurrentCvBySlug({commit, state}, cvSlug) {
            let cv = state.list.find(item => item.slug === cvSlug);
            if (cv) {
                commit('setCurrentCv', cv);
            }
        },
        async newCv({dispatch, state}, cv) {
            let result = await axios.post(`/api/cv/add`, {cv});
            dispatch('setCurrentCv', result.data.cv);
            return dispatch('loadCvs', state.filter);
        },
        async editCv({dispatch, state}, cv) {
            await axios.post(`/api/cv/update`, {cv});
            return dispatch('loadCvs', state.filter);
        },
        async deleteCv({dispatch, state}, cv) {
            await axios.post(`/api/cv/delete`, {cv});
            return dispatch('loadCvs', state.filter);
        },
    },
    mutations: {
        setCvs(state, cvs) {
            state.list = cvs;
        },
        setAllCvs(state, cvs) {
            state.all = cvs;
        },
        setCurrentCv(state, cv) {
            state.current = cv;
        },
        setFilter(state, filter) {
            state.currentFilter = filter;
        }
    }
}