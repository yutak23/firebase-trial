import { defineStore } from 'pinia';

export default defineStore('auth', {
	state: () => ({ authStateUnsubscribe: null }),
	getters: {
		authStateUnsubscribeFunc: (state) => state.authStateUnsubscribe
	},
	actions: {
		setAuthStateUnsubscribe(unsubscribe) {
			this.authStateUnsubscribe = unsubscribe;
		}
	}
});
