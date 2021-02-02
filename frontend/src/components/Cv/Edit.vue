<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-toolbar color="black" dark flat>
                        <v-toolbar-title>{{isNew ? 'Новое резюме' : 'Редактирование резюме'}}</v-toolbar-title>
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
                                    <v-form autocomplete="off">
                                        <v-text-field v-model="cv.slug" readonly v-if="!isNew"></v-text-field>

                                        <v-combobox
                                                v-model="cv.vacancy"
                                                :items="$store.getters.vacancies"
                                                label="Вакансия"
                                                @input="updateVacancy"
                                        ></v-combobox>

                                        <v-text-field v-model="cv.name" label="ФИО" hint="Например: Тугодумов Родион Всеславович"></v-text-field>
                                        <v-text-field v-model="cv.position" label="Позиция" hint="Например: Менеджер по продажам"></v-text-field>
                                        <v-text-field v-model="cv.city" label="Город"></v-text-field>
                                        <v-text-field v-model="cv.age" label="Возраст"></v-text-field>

                                        <v-textarea
                                                v-model="cv.about"
                                                label="Краткие сведения"
                                        ></v-textarea>
                                    </v-form>
                                </v-card-text>
                            </v-card>
                        </v-tab-item>
                        <v-tab-item value="skills" :transition="false" :reverse-transition="false">
                            <v-card flat>
                                <v-card-text>
                                    <v-form autocomplete="off">
                                        <v-btn large color="primary" @click="addSkill" class="mb-4">Добавить навык</v-btn>
                                        <v-row v-for="(skill, i) in cv.skills" :key="i">
                                            <v-col cols="12" md="6">
                                                <v-text-field v-model="skill.title" label="Название"></v-text-field>
                                            </v-col>
                                            <v-col cols="12" md="6">
                                                <v-rating
                                                    v-model="skill.level"
                                                    color="orange"
                                                    background-color="orange"
                                                    large
                                                    length="5"
                                                    size="64"
                                                ></v-rating>
                                            </v-col>
                                        </v-row>
                                    </v-form>
                                </v-card-text>
                            </v-card>
                        </v-tab-item>
                        <v-tab-item value="experience" :transition="false" :reverse-transition="false">
                            <v-card flat>
                                <v-card-text>
                                    <v-form autocomplete="off">
                                        <v-btn large color="primary" @click="addExp" class="mb-4">Добавить опыт</v-btn>
                                        <div v-for="(exp, i) in cv.experience" :key="i">
                                            <v-divider></v-divider>
                                            <v-text-field v-model="exp.position" label="Должность"></v-text-field>
                                            <v-text-field v-model="exp.employer" label="Компания"></v-text-field>
                                            <v-text-field v-model="exp.time" label="Когда" hint="Например: 2017-н.в." persistent-hint></v-text-field>
                                            <v-textarea
                                                    v-model="exp.about"
                                                    label="Обязанности, достижения"
                                            ></v-textarea>
                                        </div>
                                    </v-form>
                                </v-card-text>
                            </v-card>
                        </v-tab-item>
                        <v-tab-item value="education" :transition="false" :reverse-transition="false">
                            <v-card flat>
                                <v-card-text>
                                    <v-form autocomplete="off">
                                        <v-btn large color="primary" @click="addEdu" class="mb-4">Добавить образование</v-btn>
                                        <div v-for="(edu, i) in cv.education" :key="i">
                                            <v-divider></v-divider>
                                            <v-text-field v-model="edu.speciality" label="Специальность"></v-text-field>
                                            <v-text-field v-model="edu.organization" label="Учебное учреждение"></v-text-field>
                                            <v-text-field v-model="edu.time" label="Когда" hint="Например: 2017-2019" persistent-hint></v-text-field>
                                            <v-textarea
                                                    v-model="edu.about"
                                                    label="Дополнительная информация"
                                            ></v-textarea>
                                        </div>
                                    </v-form>
                                </v-card-text>
                            </v-card>
                        </v-tab-item>
                        <v-tab-item value="contacts" :transition="false" :reverse-transition="false">
                            <v-card flat>
                                <v-card-text>
                                    <v-form autocomplete="off">
                                        <v-text-field v-model="cv.phone" label="Телефон" hint="Например: +79091234567" persistent-hint></v-text-field>
                                        <v-text-field v-model="cv.email" label="Почта"></v-text-field>
                                        <v-text-field v-model="telegram" label="Telegram" hint="Например: reflexum, @reflexum, https://t.me/reflexum" persistent-hint></v-text-field>
                                        <v-text-field v-model="cv.cvLink" label="Ссылка на резюме"></v-text-field>
                                        <div v-if="cv.phone || cv.telegram">
                                            <v-divider></v-divider>
                                            <v-btn :href="telegramLink" icon target="_blank" v-if="cv.telegram"><v-icon>mdi-telegram</v-icon></v-btn>
                                            <v-btn :href="whatsappLink" icon target="_blank" v-if="cv.phone"><v-icon>mdi-whatsapp</v-icon></v-btn>
                                        </div>
                                    </v-form>
                                </v-card-text>
                            </v-card>
                        </v-tab-item>
                    </v-tabs-items>
                    <v-card-actions>
                        <v-btn @click="$router.push({name: 'cvList'})">К списку</v-btn>
                        <v-btn large color="primary" @click="save">Сохранить</v-btn>
                        <v-spacer></v-spacer>
                        <v-btn large color="primary" @click="selectFile" :loading="isResumeUploading">Распознать резюме</v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
        <input type="file" style="display: none" ref="fileInput" @change="fillDataFromResume">
    </v-container>
</template>

<script>
    import axios from "axios";
    import moment from "moment";

    export default {
        name: "Edit",
        data() {
            return {
                cv: {},
                parsed: false,
                defaultCv: {},
                activeTab: 'main',
                isResumeUploading: false,
                telegram: null,
                tabs: [
                    {code: 'main', title: 'Основные данные'},
                    {code: 'skills', title: 'Навыки'},
                    {code: 'experience', title: 'Опыт'},
                    {code: 'education', title: 'Образование'},
                    {code: 'contacts', title: 'Контакты'}
                ]
            }
        },
        async created() {
            if (this.cvId) {
                if (this.allCvs.length === 0) {
                    await this.$store.dispatch('loadCvs');
                }

                this.$store.dispatch('setCurrentCv', this.cvId);
            }
        },
        watch: {
            cvId() {
                this.$store.dispatch('setCurrentCv', this.cvId);
            },
            allCvs: {
                deep: true,
                handler() {
                    if (this.cvId) {
                        this.$store.dispatch('setCurrentCv', this.cvId);
                    }
                }
            },
            storeCv() {
                if (this.storeCv) {
                    this.cv = this.storeCv;
                    if (this.cv.parsed) {
                        this.parsed = this.cv.parsed;
                    }
                    if (this.cv.telegram) {
                        this.telegram = this.cv.telegram;
                    }
                }
                else {
                    this.cv = this.defaultCv;
                }
            },
            telegram() {
                this.cv.telegram = this.telegram
                                        .replace(/^@/, '')
                                        .replace(/^https*:\/\/.*?\//i, '')
                                        .toLowerCase()
                                        .trim();
            }
        },
        methods: {
            async save() {
                this.cv.parsed = this.parsed;
                if (this.isNew) {
                    await this.$store.dispatch('newCv', this.cv);
                }
                else {
                    await this.$store.dispatch('editCv', this.cv);
                }

                await this.$router.push({name: 'cvList'});
            },
            addExp() {
                if (!this.cv.experience) {
                    this.$set(this.cv, 'experience', [])
                }
                this.cv.experience.push({});
            },
            addEdu() {
                if (!this.cv.education) {
                    this.$set(this.cv, 'education', [])
                }
                this.cv.education.push({});
            },
            addSkill() {
                if (!this.cv.skills) {
                    this.$set(this.cv, 'skills', [])
                }
                this.cv.skills.push({});
            },
            updateVacancy(val) {
                this.cv.vacancy = val;
            },
            selectFile() {
                this.$refs.fileInput.click();
            },
            async fillDataFromResume() {
                let file = this.$refs.fileInput.files[0];

                let requestData = new FormData();
                requestData.append('file', file);

                try {
                    this.isResumeUploading = true;
                    let {data} = await axios.post('/api/cv/resume',
                        requestData,
                        {
                            headers: {'Content-Type': 'multipart/form-data'}
                        }
                    );

                    this.fillCandidate(data.candidate);
                    this.parsed = data;
                }
                catch (e) {
                    this.$store.commit('setErrorMessage', 'Ошибка загрузки файла: '+e.toString());
                }

                this.isResumeUploading = false;
            },
            fillField(cvFieldName, candFieldValue) {
                if (!this.cv[cvFieldName] && candFieldValue) {
                    this.cv[cvFieldName] = candFieldValue;
                }
            },
            fillCandidate(parsedCandidate) {
                this.fillField('name', parsedCandidate.name);
                this.fillField('position', parsedCandidate.position);
                this.fillField('city', parsedCandidate.city);
                this.fillField('phone', parsedCandidate.contacts && parsedCandidate.contacts.phone && parsedCandidate.contacts.phone[0] );
                this.fillField('email', parsedCandidate.contacts && parsedCandidate.contacts.email && parsedCandidate.contacts.email[0] );

                if (parsedCandidate.birthday) {
                    let birthday = moment(parsedCandidate.birthday);
                    let age = Math.floor( moment.duration(moment().diff(birthday)).as('years') );
                    this.fillField('age', age);
                }
                else if (parsedCandidate.age) {
                    this.fillField('age', parsedCandidate.age);
                }

                if (parsedCandidate.telegram) {
                    this.telegram = parsedCandidate.telegram;
                }

                if (parsedCandidate.skills && parsedCandidate.skills.length > 0) {
                    let parsedSkills = parsedCandidate.skills.map(skillName => ({title: skillName, level: false}));
                    if (!this.cv.skills) {
                        this.cv.skills = [];
                    }
                    this.cv.skills = this.cv.skills.concat(parsedSkills);
                }

                if (parsedCandidate.hh && parsedCandidate.hh.work && parsedCandidate.hh.work.length > 0) {
                    this.cv.experience = parsedCandidate.hh.work.map(work => {
                        return {
                            position: work.position,
                            employer: work.organisation,
                            time: [work.start, work.end].join(' - '),
                            about: work.description,
                        }
                    });
                }

                if (parsedCandidate.hh && parsedCandidate.hh.education && parsedCandidate.hh.education.length > 0) {
                    this.cv.education = parsedCandidate.hh.education.map(edu => {
                        return {
                            speciality: edu.title || edu.type,
                            organization: edu.organisation,
                            time: edu.endYear,
                            about: edu.details,
                        }
                    });
                }
            }
        },
        computed: {
            isNew() {
                return !(this.$route.params && this.$route.params.id);
            },
            cvId() {
                return (this.$route.params && this.$route.params.id) || false;
            },
            storeCv() {
                return this.$store.state.cv.current;
            },
            allCvs() {
                return this.$store.state.cv.list;
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

</style>