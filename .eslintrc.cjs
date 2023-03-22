/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
	root: true,
	extends: [
		'plugin:vue/vue3-essential',
		'plugin:vuetify/recommended',
		'eslint:recommended',
		'airbnb-base',
		'@vue/eslint-config-prettier'
	],
	parserOptions: {
		ecmaVersion: 'latest'
	},
	settings: {
		'import/resolver': {
			'eslint-import-resolver-custom-alias': {
				alias: {
					'@': './src'
				},
				extensions: ['.js', '.vue']
			}
		}
	},
	rules: {
		'import/no-extraneous-dependencies': ['warn', { packageDir: './' }]
	}
};
