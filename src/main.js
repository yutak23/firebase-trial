import { createApp } from 'vue';
import { createPinia } from 'pinia';

import vuetify from '@/plugins/vuetify';
import i18n from '@/plugins/i18n';
import webfontloader from '@/plugins/webfontloader';
import App from './App.vue';
import router from './router';

const app = createApp(App);

webfontloader();
app.use(i18n);
app.use(vuetify);
app.use(createPinia());
app.use(router);

app.mount('#app');
