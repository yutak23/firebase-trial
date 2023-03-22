import '@mdi/font/css/materialdesignicons.css';
// eslint-disable-next-line import/no-unresolved
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
// eslint-disable-next-line import/no-unresolved
import * as components from 'vuetify/components';
// eslint-disable-next-line import/no-unresolved
import * as directives from 'vuetify/directives';
import colors from 'vuetify/lib/util/colors';
// eslint-disable-next-line import/no-unresolved
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n';
import { useI18n } from 'vue-i18n';
import i18n from '@/plugins/i18n';

const vuetify = createVuetify({
	components,
	directives,
	theme: {
		themes: {
			light: {
				dark: false,
				colors: {
					secondary: colors.grey.darken1
				}
			}
		}
	},
	locale: {
		adapter: createVueI18nAdapter({ i18n, useI18n })
	}
});

export default vuetify;
