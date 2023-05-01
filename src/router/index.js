import { toRefs } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { storeToRefs } from 'pinia';
import useAuthStore from '@/stores/auth';
import useUserStore from '@/stores/user';
import { authenticate } from '@/firebase/auth';
import HomeView from '@/views/HomeView.vue';
import UserInviteView from '@/views/UserInviteView.vue';
import GroupView from '@/views/GroupView.vue';
import GroupSettingsView from '@/views/GroupSettingsView.vue';
import WelcomeView from '@/views/WelcomeView.vue';

import { fetchUser } from '@/service/user-service';

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			component: HomeView,
			meta: { requiresAuth: true }
		},
		{
			path: '/account/invites',
			name: 'userInvites',
			component: UserInviteView,
			meta: { requiresAuth: true }
		},
		{
			path: '/groups/:groupId',
			name: 'groups',
			component: GroupView,
			meta: { requiresAuth: true }
		},
		{
			path: '/groups/:groupId/settings',
			name: 'groupsSettings',
			component: GroupSettingsView,
			meta: { requiresAuth: true }
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

	if (to.name === 'welcome' && uid.value) return { name: 'home', params: {} };

	if (to.meta.requiresAuth) {
		if (!uid.value) return { name: 'welcome', params: {} };

		if (!firstName.value) {
			const userSelf = await fetchUser();
			if (!userSelf) return { name: 'welcome', params: {} };

			updateUser(userSelf);
		}
	}

	console.log(to, from);
	return true;
});

export default router;
