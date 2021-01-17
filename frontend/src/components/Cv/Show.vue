<template>
    <v-container class="fill-height align-start">
        <v-row v-if="cvSlug">
            <v-col cols="12">
                <v-card>
                    <v-toolbar color="black" dark flat>
                        <v-toolbar-title>{{cv.name}}<br><small>{{cv.position}}</small></v-toolbar-title>
                        <template v-slot:extension>
                            <v-tabs v-model="activeTab" centered slider-color="yellow">
                                <v-tab v-for="tab in tabs" :key="tab.code"
                                        :href="`#${tab.code}`"
                                >{{tab.title}}</v-tab>
                            </v-tabs>
                        </template>
                    </v-toolbar>

                    <v-tabs-items v-model="activeTab" reverse>
                        <v-tab-item value="main" :transition="false" :reverse-transition="false">
                            <v-card flat>
                                <v-card-text>
                                    <v-row>
                                        <v-col cols="12" :md="showContacts ? 8 : 12">
                                            <h3 class="ml-4 mb-4" v-if="cv.about">
                                                Краткие сведения
                                            </h3>
                                            <div v-if="cv.about" class="ml-4">
                                                {{cv.about}}
                                            </div>
                                        </v-col>
                                        <v-col cols="12" md="4" v-if="showContacts">
                                            <v-list dense class="contacts">
                                                <v-list-item v-if="cv.city">
                                                    <v-list-item-icon><v-icon>mdi-map-marker</v-icon></v-list-item-icon>
                                                    <v-list-item-content>
                                                        <span v-if="cv.city">{{cv.city}}</span>
                                                        <span v-if="cv.age">{{cv.age}}</span>
                                                    </v-list-item-content>
                                                </v-list-item>
                                                <v-list-item v-if="cv.phone">
                                                    <v-list-item-icon class="mr-5"><v-icon>mdi-phone</v-icon></v-list-item-icon>
                                                    <v-list-item-content>
                                                        <v-btn text :href="'tel:'+cv.phone" target="_blank">{{cv.phone}}</v-btn>
                                                    </v-list-item-content>
                                                </v-list-item>
                                                <v-list-item v-if="cv.email">
                                                    <v-list-item-icon class="mr-5"><v-icon>mdi-at</v-icon></v-list-item-icon>
                                                    <v-list-item-content>
                                                        <v-btn text :href="'mailto:'+cv.phone" target="_blank">{{cv.email}}</v-btn>
                                                    </v-list-item-content>
                                                </v-list-item>
                                                <v-list-item v-if="cv.phone">
                                                    <v-list-item-icon class="mr-5"><v-icon>mdi-whatsapp</v-icon></v-list-item-icon>
                                                    <v-list-item-content>
                                                        <v-btn text :href="whatsappLink" target="_blank">
                                                            {{cv.phone}}
                                                            <v-icon small class="ml-2">mdi-open-in-new</v-icon>
                                                        </v-btn>
                                                    </v-list-item-content>
                                                </v-list-item>
                                                <v-list-item v-if="cv.telegram">
                                                    <v-list-item-icon class="mr-5"><v-icon>mdi-telegram</v-icon></v-list-item-icon>
                                                    <v-list-item-content>
                                                        <v-btn text :href="telegramLink" target="_blank">
                                                            @{{cv.telegram}}
                                                            <v-icon small class="ml-2">mdi-open-in-new</v-icon>
                                                        </v-btn>
                                                    </v-list-item-content>
                                                </v-list-item>
                                                <v-list-item v-if="cv.cvLink">
                                                    <v-list-item-icon class="mr-5"><v-icon>mdi-card-account-details</v-icon></v-list-item-icon>
                                                    <v-list-item-content>
                                                        <v-btn text :href="cv.cvLink" target="_blank">
                                                            Резюме
                                                            <v-icon small class="ml-2">mdi-open-in-new</v-icon>
                                                        </v-btn>
                                                    </v-list-item-content>
                                                </v-list-item>
                                            </v-list>
                                        </v-col>
                                    </v-row>
                                </v-card-text>
                            </v-card>
                        </v-tab-item>
                        <v-tab-item value="experience" :transition="false" :reverse-transition="false">
                            <v-card flat>
                                <v-card-text>
                                    <v-row>
                                        <v-col cols="12" md="8">
                                            <h3 class="ml-4 mb-4" v-if="cv.experience">
                                                Опыт
                                            </h3>
                                            <v-list two-line v-if="cv.experience">
                                                <v-list-item v-for="(exp, i) in cv.experience" :key="i">
                                                    <v-list-item-content>
                                                        <v-list-item-title>{{exp.position}}</v-list-item-title>
                                                        <v-list-item-subtitle>{{exp.employer}}</v-list-item-subtitle>
                                                        <v-list-item-subtitle class="mt-4">{{exp.about}}</v-list-item-subtitle>
                                                    </v-list-item-content>
                                                    <v-list-item-icon class="align-start">{{exp.time}}</v-list-item-icon>
                                                </v-list-item>
                                            </v-list>
                                        </v-col>
                                        <v-col cols="12" md="4">
                                            <h3 class="mb-4" v-if="cv.skills">Ключевые навыки</h3>
                                            <v-list dense>
                                                <v-list-item v-for="skill in cv.skills" :key="skill.title">
                                                    <v-list-item-content>
                                                        {{skill.title}}
                                                    </v-list-item-content>
                                                    <v-list-item-action>
                                                        <v-rating
                                                                :value="skill.level"
                                                                readonly
                                                                small
                                                                dense
                                                                color="orange"
                                                                background-color="orange"
                                                        ></v-rating>
                                                    </v-list-item-action>
                                                </v-list-item>
                                            </v-list>
                                        </v-col>
                                    </v-row>
                                </v-card-text>
                            </v-card>
                        </v-tab-item>
                        <v-tab-item value="education" :transition="false" :reverse-transition="false">
                            <v-card flat>
                                <v-card-text>
                                    <v-row>
                                        <v-col cols="12">
                                            <h3 class="ml-4 mb-4" v-if="cv.education">
                                                Образование
                                            </h3>
                                            <v-list two-line v-if="cv.education">
                                                <v-list-item v-for="(edu, i) in cv.education" :key="i">
                                                    <v-list-item-content>
                                                        <v-list-item-title>{{edu.speciality}}</v-list-item-title>
                                                        <v-list-item-subtitle>{{edu.organization}}</v-list-item-subtitle>
                                                        <v-list-item-subtitle class="mt-4">{{edu.about}}</v-list-item-subtitle>
                                                    </v-list-item-content>
                                                    <v-list-item-icon class="align-start">{{edu.time}}</v-list-item-icon>
                                                </v-list-item>
                                            </v-list>
                                        </v-col>
                                    </v-row>
                                </v-card-text>
                            </v-card>
                        </v-tab-item>
                    </v-tabs-items>
                </v-card>
            </v-col>
        </v-row>
        <v-row v-else>
            <v-col cols="12">
                <v-card><v-card-title>Какой-то бардак</v-card-title></v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    export default {
        name: "Show",
        data() {
            return {
                showContacts: true,
                activeTab: 'main',
                tabs: [
                    {code: 'main', title: 'Основные данные'},
                    {code: 'experience', title: 'Опыт'},
                    {code: 'education', title: 'Образование'},
                ]
            }
        },
        async created() {
            if (this.cvSlug) {
                this.$store.dispatch('loadCvBySlug', this.cvSlug);
            }
        },
        methods: {
        },
        computed: {
            cvSlug() {
                let isSubdomain = /^([^.]+)\.yozh\.space$/.test(location.hostname);
                if (isSubdomain) {
                    let [, slug] = location.hostname.match(/^([^.]+)\.yozh\.space$/);
                    return slug;
                }
                return (this.$route.params && this.$route.params.slug) || false;
            },
            cv() {
                return this.$store.state.cv.current;
            },
            contacts() {
                let contacts = [];
                if (this.cv.phone) {
                    contacts.push(this.cv.phone);
                }

                if (this.cv.email) {
                    contacts.push(this.cv.email);
                }

                return contacts.join('&bull;');
            },
            telegramLink() {
                return `https://t.me/${this.cv.telegram}`;
            },
            whatsappLink() {
                let phoneDigits = this.cv.phone.replace(/[^\d]+/gi, '');
                return `https://api.whatsapp.com/send?phone=${phoneDigits}`;
            }
        }
    }
</script>

<style scoped>
    .v-toolbar__title {font-size: 1.75rem; line-height: 1; margin-left: 0.5rem; margin-top: 0.5rem;}
    .contacts .v-btn {justify-content: start;text-transform: none; font-weight: normal; margin-top: -5px;}
    .v-list-item__title, .v-list-item__subtitle {white-space: break-spaces;}
</style>