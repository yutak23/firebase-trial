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
			},
			// pinia などの exports フィールドのみを持つパッケージは
			// custom-alias が内部で使う古い node リゾルバでは解決できないため、
			// exports 対応の node リゾルバをフォールバックとして併用する
			node: {
				extensions: ['.mjs', '.js', '.json', '.node', '.vue']
			}
		}
	},
	rules: {
		'import/no-extraneous-dependencies': ['warn', { packageDir: './' }]
	}
};
