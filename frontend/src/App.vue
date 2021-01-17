<template>
    <v-app id="cvshow">
        <v-alert type="error" v-model="showError" dismissible tile class="global-error">{{appError}}</v-alert>
        <v-navigation-drawer v-model="drawer" app clipped v-if="isLoggedIn && routes && routes.length > 0">
            <v-list dense>
                <v-list-item v-for="route in routes" :key="route.code"
                        link
                        @click="$router.push({name: route.code})"
                        :disabled="$route.name === route.code"
                >
                    <v-list-item-action>
                        <v-icon v-text="route.icon"></v-icon>
                    </v-list-item-action>
                    <v-list-item-content>
                        <v-list-item-title>{{route.title}}</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item v-if="isLoggedIn" link @click="logout">
                    <v-list-item-action>
                        <v-icon>mdi-logout</v-icon>
                    </v-list-item-action>
                    <v-list-item-content>
                        <v-list-item-title>Выход</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>

        <v-app-bar app clipped-left color="black" dark>
            <v-app-bar-nav-icon @click.stop="drawer = !drawer" v-if="isLoggedIn"></v-app-bar-nav-icon>
            <img :src="logo" height="56px" class="mr-4">
            <v-toolbar-title>{{title}}</v-toolbar-title>
            <v-spacer></v-spacer>
            <div class="d-none d-md-block text-right">
                <p class="mb-0">помогаем сотруднику и работодателю вести взаимовыгодное сотрудничество</p>
                <v-btn link small text href="mailto:bogdanartemov1703@yozh.space" class="pa-0">
                    bogdanartemov1703@yozh.space
                </v-btn>
            </div>
            <div class="d-block d-md-none">
                <v-btn icon href="mailto:bogdanartemov1703@yozh.space"><v-icon>mdi-email</v-icon></v-btn>
            </div>
        </v-app-bar>

        <v-main app>
            <router-view></router-view>
        </v-main>

        <v-snackbar v-model="showMessage" :timeout="5000" :color="appMessage.color">
            {{ appMessage.text }}
            <template v-slot:action="{ attrs }">
                <v-btn icon v-bind="attrs" @click="showMessage = false"> <v-icon>mdi-close</v-icon> </v-btn>
            </template>
        </v-snackbar>
    </v-app>
</template>

<script>
    import logo from "./assets/logo.png";

    export default {
        name: 'App',
        data: () => ({
            logo,
            drawer: null,
            showError: false,
            showMessage: false,
        }),
        async created() {
            await this.$store.dispatch('loginLocalUser');
        },
        watch: {
            appError() {
                this.showError = true;
            },
            appMessage() {
                this.showMessage = true;
            }
        },
        methods: {
            async logout() {
                await this.$store.dispatch('logoutUser');
                return this.$router.push({name: 'login'});
            }
        },
        computed: {
            appError() {
                return this.$store.state.appError;
            },
            appMessage() {
                return this.$store.state.appMessage;
            },
            title() {
                return this.$route.meta && this.$route.meta.title
                    ? this.$route.meta.title
                    : 'ЁжSearch';
            },
            routes() {
                return this.$store.getters.allowedRoutes;
            },
            isLoggedIn() {
                return this.$store.getters.isLoggedIn;
            }
        }
    }
</script>

<style>
    .v-application .error {z-index: 100}
</style>
