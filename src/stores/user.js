import { defineStore } from 'pinia';

export default defineStore('user', {
	state: () => ({
		userInfo: { id: null, email: '', firstName: '', lastName: '', logoUri: '' }
	}),
	getters: {
		user: (state) => state.userInfo
	},
	actions: {
		updateUser(user = {}) {
			Object.keys(this.userInfo)
				.filter((key) => key in user)
				.forEach((key) => {
					this.userInfo[key] = user[key];
				});
		}
	}
});
