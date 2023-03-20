module.exports = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'subject-case': [
			1,
			'never',
			['sentence-case', 'start-case', 'pascal-case', 'upper-case']
		],
		'redmine-rule': [1, 'always']
	},
	plugins: [
		{
			rules: {
				'redmine-rule': ({ subject }) => {
					const pattern = / refs#\d+$/;
					return [
						new RegExp(pattern).test(subject),
						`Your subject should contain suffix for redmine`
					];
				}
			}
		}
	]
};
