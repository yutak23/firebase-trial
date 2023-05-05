require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
	parserOptions: {
		ecmaVersion: 2023
	},
	extends: ['google', 'prettier'],
	rules: {
		'import/no-extraneous-dependencies': 'warn'
	},
	overrides: [
		{
			files: ['**/*.spec.*'],
			env: {
				mocha: true
			},
			rules: {}
		}
	]
};
