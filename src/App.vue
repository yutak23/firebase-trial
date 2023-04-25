<script setup>
import { computed } from 'vue';
import { useRouter, RouterView } from 'vue-router';
import { storeToRefs } from 'pinia';
import { signOut } from 'firebase/auth';

import { auth } from '@/firebase';
import useUserStore from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const logoutable = computed(
	() => !!user.value.id && router.currentRoute.value.name !== 'welcome'
);
const logout = async () => {
	try {
		await signOut(auth);
		console.log('Sign-out successful.');

		router.push({ name: 'welcome', params: {} });
	} catch (e) {
		console.log(e);
	}
};
</script>

<template>
	<v-app>
		<v-app-bar density="compact">
			<v-app-bar-title class="photos">{{ $t('app.title') }}</v-app-bar-title>

			<template v-slot:append>
				<v-btn v-if="logoutable" icon @click="logout">
					<v-icon icon="mdi-logout-variant" />
				</v-btn>
			</template>
		</v-app-bar>

		<v-main class="bg-grey-lighten-5">
			<!-- https://tech.yappli.io/entry/suspense-with-routerview -->
			<RouterView v-slot="{ Component }">
				<template v-if="Component">
					<Suspense timeout="0">
						<template #default>
							<component :is="Component" />
						</template>

						<template #fallback>
							<v-container class="d-flex justify-center align-center">
								<v-progress-circular color="primary" indeterminate size="64" />
							</v-container>
						</template>
					</Suspense>
				</template>
			</RouterView>
		</v-main>
	</v-app>
</template>

<style lang="sass" scoped>
.photos
	color: red
</style>
