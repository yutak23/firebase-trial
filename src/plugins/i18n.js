import { createI18n } from 'vue-i18n';
import path from 'node:path';

const loadLocaleMessages = () => {
	const messages = {};

	const locales = import.meta.glob('@/locales/*.json', { eager: true });
	Object.keys(locales).forEach((dirPath) => {
		messages[path.parse(dirPath).name] = locales[dirPath].default;
	});

	return messages;
};

// eslint-disable-next-line new-cap
const i18n = new createI18n({
	legacy: false, // Vuetify does not support the legacy mode of vue-i18n
	locale: 'ja',
	fallbackLocale: 'en',
	messages: loadLocaleMessages()
});

export default i18n;
