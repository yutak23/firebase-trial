<script setup>
import { computed, ref, reactive } from 'vue';
import { useRouter, RouterView } from 'vue-router';
import { storeToRefs } from 'pinia';
import { signOut } from 'firebase/auth';

import { auth } from '@/firebase';
import useUserStore from '@/stores/user';
import { fetchMyGroups } from '@/service/group-service';
import { fetchUser } from '@/service/user-service';

const router = useRouter();
const userStore = useUserStore();
const { updateUser } = userStore;
const { user } = storeToRefs(userStore);

const drawer = ref(false);
const closeDrawer = () => {
	drawer.value = false;
};
const dispalyName = computed(
	() => `${user.value.lastName} ${user.value.firstName}`
);
const navigateToHome = () => {
	router.push({ name: 'home', params: {} });
	closeDrawer();
};
const navigateToGroupSettings = () => {
	router.push({ name: 'groupsSettings', params: {} });
	closeDrawer();
};
const navigateToAccountSetting = () => {
	console.log('TODO navigateToAccountSetting');
	closeDrawer();
};
const navigateToUserInvites = () => {
	router.push({ name: 'userInvites', params: {} });
	closeDrawer();
};

const logout = async () => {
	try {
		await signOut(auth);
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

if (!user.value.firstName) {
	const myself = await fetchUser();
	updateUser(myself);
}

// TODO https://firebase.google.com/docs/firestore/query-data/listen?hl=ja#listen_to_multiple_documents_in_a_collection を利用した実装を試す
const groups = reactive([]);
const myGroups = await fetchMyGroups();
myGroups.forEach((v) => {
	groups.push(v);
});
const selectedGroup = ref(groups[0].id); // TODO piniaでselectedGroupを管理し、選択があればそれを利用
</script>

<template>
	<v-app>
		<v-app-bar density="compact">
			<v-app-bar-title class="photos">{{ $t('app.title') }}</v-app-bar-title>

			<v-btn @click.stop="drawer = true" variant="text" icon>
				<v-icon> mdi-dots-vertical </v-icon>
			</v-btn>
		</v-app-bar>

		<v-dialog
			v-model="drawer"
			persistent
			fullscreen
			transition="slide-x-transition"
		>
			<v-card>
				<v-card-title></v-card-title>
				<v-card-subtitle class="d-flex align-center">
					<v-spacer></v-spacer>
					<div class="ml-5">My家計簿</div>
					<v-spacer></v-spacer>
					<v-icon icon="mdi-window-close" @click="drawer = false" />
				</v-card-subtitle>
				<v-card-text>
					<!-- TODO アカウント情報の変更ページを実装 -->
					<v-list-item class="mb-4 px-0" @click="navigateToAccountSetting">
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

					<!-- TODO グループ数が5以内ならグループを新規で作成できるようにする -->
					<v-select
						v-model="selectedGroup"
						:items="groups"
						item-title="name"
						item-value="id"
						label="グループ選択"
						hide-details
						class="pb-2"
					/>

					<v-list>
						<v-list-subheader>家計簿</v-list-subheader>
						<v-list-item @click="navigateToHome">
							<template v-slot:prepend>
								<v-icon icon="mdi-home" />
							</template>
							<v-list-item-title> Home </v-list-item-title>
						</v-list-item>
						<v-list-item @click="navigateToGroupSettings">
							<template v-slot:prepend>
								<v-icon icon="mdi-cog-outline" />
							</template>
							<v-list-item-title> グループの管理 </v-list-item-title>
						</v-list-item>

						<v-list-subheader>アカウント</v-list-subheader>
						<v-list-item @click="navigateToUserInvites">
							<template v-slot:prepend>
								<v-icon icon="mdi-email-newsletter" />
							</template>

							<v-list-item-title> グループからの招待一覧 </v-list-item-title>
						</v-list-item>
					</v-list>

					<v-divider></v-divider>

					<v-list density="compact">
						<v-list-item @click="logout">
							<v-list-item-subtitle> ログアウト </v-list-item-subtitle>
							<template v-slot:append>
								<v-icon icon="mdi-logout-variant" />
							</template>
						</v-list-item>
					</v-list>
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
							<component :is="Component" :selected-group="selectedGroup" />
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
