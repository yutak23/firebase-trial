import { toRefs } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { storeToRefs } from 'pinia';
import useAuthStore from '@/stores/auth';
import useUserStore from '@/stores/user';
import { authenticate } from '@/firebase/auth';
import HomeView from '@/views/HomeView.vue';
import GroupView from '@/views/GroupView.vue';
import WelcomeView from '@/views/WelcomeView.vue';

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
			path: '/groups/:groupId',
			name: 'groups',
			component: GroupView,
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
	const { user } = storeToRefs(userStore);
	const { id: uid } = toRefs(user.value);

	if (!authStateUnsubscribeFunc.value)
		authStore.setAuthStateUnsubscribe(await authenticate(userStore));

	if (to.meta.requiresAuth)
		if (!uid.value) return { name: 'welcome', params: {} };

	console.log(to, from);
	return true;
});

export default router;
