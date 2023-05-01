<script setup>
import { computed, ref } from 'vue';
import { useRouter, RouterView } from 'vue-router';
import { storeToRefs } from 'pinia';
import { signOut } from 'firebase/auth';

import { auth } from '@/firebase';
import useUserStore from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const userDialog = ref(false);
const openUserDialog = () => {
	userDialog.value = true;
};
const closeUserDialog = () => {
	userDialog.value = false;
};
const dispalyName = computed(
	() => `${user.value.lastName} ${user.value.firstName}`
);
const navigateToUserInvites = () => {
	closeUserDialog();
	router.push({ name: 'userInvites', params: {} });
};

const logout = async () => {
	try {
		await signOut(auth);
		closeUserDialog();
		console.log('Sign-out successful.');

		router.push({ name: 'welcome', params: {} });
	} catch (e) {
		console.log(e);
	}
};

const overlay = ref(true);
const displayLoading = () => {
	overlay.value = true;
};
const closeLoading = () => {
	overlay.value = false;
};
</script>

<template>
	<v-app>
		<v-app-bar density="compact">
			<v-app-bar-title class="photos">{{ $t('app.title') }}</v-app-bar-title>

			<template v-slot:append>
				<v-btn icon @click="openUserDialog">
					<v-icon>
						<v-avatar size="small">
							<v-img :src="user.logoUri" />
						</v-avatar>
					</v-icon>
				</v-btn>
			</template>
		</v-app-bar>

		<v-dialog
			v-model="userDialog"
			persistent
			:fullscreen="$vuetify.display.name === 'xs'"
			transition="dialog-bottom-transition"
		>
			<v-card>
				<v-card-title></v-card-title>
				<v-card-subtitle class="d-flex justify-space-between">
					<div>
						<v-icon
							icon="mdi-window-close"
							start
							@click="userDialog = !userDialog"
						/>
						アカウント
					</div>
					<v-icon icon="mdi-logout-variant" @click="logout" />
				</v-card-subtitle>
				<v-card-text>
					<v-row>
						<v-col cols="12">
							<v-list>
								<v-list-item class="mb-4">
									<template v-slot:prepend>
										<v-avatar>
											<v-img :src="user.logoUri" />
										</v-avatar>
									</template>

									<v-list-item-title>
										{{ dispalyName }}
									</v-list-item-title>
									<v-list-item-subtitle>
										{{ user.email }}
									</v-list-item-subtitle>
								</v-list-item>

								<v-list-item @click="navigateToUserInvites">
									<template v-slot:prepend>
										<v-icon icon="mdi-email-newsletter" />
									</template>

									<v-list-item-title>
										グループからの招待一覧
									</v-list-item-title>
								</v-list-item>
							</v-list>
						</v-col>
					</v-row>
				</v-card-text>
			</v-card>
		</v-dialog>

		<v-main class="bg-grey-lighten-5">
			<!-- https://tech.yappli.io/entry/suspense-with-routerview -->
			<RouterView v-slot="{ Component }">
				<template v-if="Component">
					<Suspense
						timeout="0"
						@resolve="closeLoading"
						@pending="displayLoading"
					>
						<template #default>
							<component :is="Component" />
						</template>

						<template #fallback>
							<v-overlay
								:model-value="overlay"
								class="align-center justify-center"
							>
								<v-progress-circular color="primary" indeterminate size="64" />
							</v-overlay>
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
