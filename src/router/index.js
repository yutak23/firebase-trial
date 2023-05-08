import { toRefs } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { storeToRefs } from 'pinia';

import useAuthStore from '@/stores/auth';
import useUserStore from '@/stores/user';
import { authenticate } from '@/firebase/auth';
import { fetchUser } from '@/service/user-service';

import GlobalView from '@/views/GlobalView.vue';
import HomeView from '@/views/HomeView.vue';
import UserInviteView from '@/views/UserInviteView.vue';
import GroupSettingsView from '@/views/GroupSettingsView.vue';
import WelcomeView from '@/views/WelcomeView.vue';

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'global',
			component: GlobalView,
			meta: { requiresAuth: true },
			children: [
				{ path: '/', name: 'home', component: HomeView },
				{
					path: '/groups/settings',
					name: 'groupsSettings',
					component: GroupSettingsView
				},
				{
					path: '/account/invites',
					name: 'userInvites',
					component: UserInviteView,
					meta: { requiresAuth: true }
				}
			]
		},
		{
			path: '/welcome',
			name: 'welcome',
			component: WelcomeView
		},
		{ path: '/:pathMatch(.*)*', redirect: { name: 'home', params: {} } }
	]
});

router.beforeEach(async (to, from) => {
	const authStore = useAuthStore();
	const { authStateUnsubscribeFunc } = storeToRefs(authStore);
	const userStore = useUserStore();
	const { updateUser } = userStore;
	const { user } = storeToRefs(userStore);
	const { id: uid, firstName } = toRefs(user.value);

	if (!authStateUnsubscribeFunc.value)
		authStore.setAuthStateUnsubscribe(await authenticate(userStore));

	if (to.meta.requiresAuth) {
		if (!uid.value) return { name: 'welcome', params: {} };

		if (!firstName.value) {
			const myself = await fetchUser();
			if (!myself) return { name: 'welcome', params: {} };
			updateUser(myself);
		}
	}

	console.log(to, from);
	return true;
});

export default router;
