<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import md5 from 'crypto-js/md5';

import firebase from 'firebase/compat/app';
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';
import { doc, setDoc, getDoc } from 'firebase/firestore';

import { auth, db } from '@/firebase';
import { converter } from '@/firebase/store';
import useUserStore from '@/stores/user';
import HelloWorld from '@/components/HelloWorld.vue';

const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const isLogined = computed(() => !!user.value.uid);

if (isLogined.value) {
	const userDocSnap = await getDoc(
		doc(db, 'users', user.value.uid).withConverter(converter)
	);
	if (userDocSnap.exists()) router.push({ name: 'home', params: {} });
}

onMounted(() => {
	const ui =
		firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);

	if (!isLogined.value) {
		ui.start('#firebaseui-auth-container', {
			signInOptions: [
				{
					provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
					scopes: ['email'],
					customParameters: { prompt: 'select_account' }
				}
			],
			callbacks: {
				// eslint-disable-next-line no-unused-vars
				signInSuccessWithAuthResult(authResult, redirectUrl) {
					router.push({ name: 'home', params: {} });
					return false;
				}
			}
		});
	}
});

const step = ref(1);
const form = ref(null);
const firstName = ref('');
const lastName = ref('');
const dispalyName = computed(() => firstName.value.substring(0, 2));
const userRegister = async () => {
	const { valid } = await form.value.validate();

	if (valid) {
		step.value = 2;

		await setDoc(doc(db, 'users', user.value.uid).withConverter(converter), {
			id: user.value.uid,
			email: user.value.email,
			firstName: firstName.value,
			lastName: lastName.value,
			logoUri: `https://www.gravatar.com/avatar/${md5(user.value.email)}`
		});

		setTimeout(() => {
			router.push({ name: 'home', params: {} });
		}, 1000);
	}
};
const currentTitle = computed(() => {
	switch (step.value) {
		case 1:
			return '新規登録';
		default:
			return 'アカウント作成中';
	}
});
</script>

<template>
	<v-container>
		<h1>This is an welcome page</h1>
		<img
			alt="Vue logo"
			class="logo"
			src="@/assets/logo.svg"
			width="125"
			height="125"
		/>

		<HelloWorld msg="You did it!" />

		<v-row v-if="!isLogined" class="pt-2">
			<v-col>
				<div id="firebaseui-auth-container"></div>
			</v-col>
		</v-row>

		<v-row v-else class="justify-center pt-2">
			<v-col cols="12" md="6">
				<v-card elevation="1">
					<v-card-title>
						{{ currentTitle }}
					</v-card-title>

					<v-window v-model="step">
						<v-window-item :value="1">
							<v-form ref="form">
								<v-container>
									<v-row>
										<v-col cols="12" class="pb-1">
											<v-text-field
												v-model="user.email"
												label="メールアドレス"
												readonly
												variant="underlined"
											/>
										</v-col>
										<v-col cols="6" class="py-1">
											<v-text-field
												v-model="lastName"
												label="姓"
												:rules="[(v) => !!v || 'Item is required']"
												validate-on="blur"
												variant="underlined"
										/></v-col>
										<v-col cols="6" class="py-1">
											<v-text-field
												v-model="firstName"
												label="名"
												:rules="[(v) => !!v || 'Item is required']"
												validate-on="blur"
												variant="underlined"
											/>
										</v-col>
										<v-col cols="12" class="py-1">
											<span class="text-body-2">アイコン表示イメージ</span>
											<v-list-item class="w-100 px-0">
												<template v-slot:prepend>
													<v-avatar color="primary">
														{{ dispalyName }}
													</v-avatar>
												</template>
											</v-list-item>
										</v-col>
									</v-row>
								</v-container>
							</v-form>
							<v-card-actions>
								<v-spacer></v-spacer>

								<v-btn color="success" @click="userRegister">
									登録を完了する
									<v-icon icon="mdi-chevron-right" end></v-icon>
								</v-btn>
							</v-card-actions>
						</v-window-item>

						<v-window-item :value="2">
							<v-card-text class="text-center">
								<v-progress-circular color="primary" indeterminate />
							</v-card-text>
						</v-window-item>
					</v-window>
				</v-card>
			</v-col>
		</v-row>
	</v-container>
</template>
