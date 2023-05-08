<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import snakecaseKeys from 'snakecase-keys';
import md5 from 'crypto-js/md5';

import firebase from 'firebase/compat/app';
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';
import {
	doc,
	setDoc,
	getDoc,
	collection,
	runTransaction
} from 'firebase/firestore';

import { auth, db } from '@/firebase';
import { converter } from '@/firebase/store';
import useUserStore from '@/stores/user';
import HelloWorld from '@/components/HelloWorld.vue';

const router = useRouter();
const userStore = useUserStore();
const { updateUser } = userStore;
const { user } = storeToRefs(userStore);

const isLogined = computed(() => !!user.value.id);

const redirecting = ref(true);
const checkUserExists = async () => {
	const userDocSnap = await getDoc(
		doc(db, 'users', user.value.id).withConverter(converter)
	);
	if (userDocSnap.exists()) {
		updateUser(userDocSnap.data());
		router.push({ name: 'home', params: {} });
		return;
	}

	redirecting.value = false;
};
if (isLogined.value) await checkUserExists();

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
				async signInSuccessWithAuthResult(authResult, redirectUrl) {
					await checkUserExists();
					return false;
				}
			}
		});
	}
});

const step = ref(1);
const createUserForm = ref(null);
const createGroupForm = ref(null);
const firstName = ref('');
const lastName = ref('');
const logoUri = ref(`https://www.gravatar.com/avatar/${md5(user.value.email)}`);
const groupName = ref('');
const stepTo = async (number) => {
	if (number === 2) {
		const { valid } = await createUserForm.value.validate();
		if (valid) step.value = number;
		return;
	}
	step.value = number;
};

const userRegister = async () => {
	const { valid } = await createUserForm.value.validate();

	if (valid) {
		const baseUser = {
			id: user.value.id,
			email: user.value.email,
			firstName: firstName.value,
			lastName: lastName.value,
			logoUri: logoUri.value
		};
		await setDoc(doc(db, 'users', user.value.id).withConverter(converter), {
			...baseUser,
			ownerGroupCount: 0
		});
		updateUser(baseUser);
	}
};
const createGroup = async () => {
	const { valid } = await createGroupForm.value.validate();

	if (valid) {
		const userDocRef = doc(db, 'users', user.value.id);

		try {
			await runTransaction(db, async (transaction) => {
				const userDoc = await transaction.get(
					userDocRef.withConverter(converter)
				);
				if (!userDoc.exists()) throw new Error('Document does not exist');

				const docRef = doc(collection(db, 'groups'));
				transaction
					.set(docRef.withConverter(converter), {
						name: groupName.value,
						createdBy: auth.currentUser.uid
					})
					// 同時にmember_usersサブコレクションを作成する（Cloud Functionsにしてしまってもいい）
					.set(
						doc(
							db,
							docRef.path,
							'member_users',
							md5(auth.currentUser.email).toString()
						).withConverter(converter),
						user.value
					);

				transaction.update(
					userDocRef,
					snakecaseKeys({
						ownerGroupCount: userDoc.data().ownerGroupCount + 1
					})
				);
			});
			console.log('Transaction successfully committed!');
		} catch (e) {
			console.log('Transaction failed: ', e);
		}
	}
};
const register = async () => {
	stepTo(3);

	await userRegister();
	await createGroup();

	updateUser({
		...user.value,
		firstName: firstName.value,
		lastName: lastName.value,
		logoUri: logoUri.value
	});

	setTimeout(() => {
		router.push({ name: 'home', params: {} });
	}, 1000);
};

const currentTitle = computed(() => {
	switch (step.value) {
		case 1:
			return '新規登録';
		case 2:
			return 'グループ作成';
		default:
			return 'アカウント作成中';
	}
});
</script>

<template>
	<v-main class="bg-grey-lighten-5">
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

			<v-row v-if="!redirecting" class="justify-center pt-2">
				<v-col cols="12" md="6">
					<v-card elevation="1">
						<v-card-title class="d-flex align-center justify-space-between">
							<span>{{ currentTitle }}</span>
							<span class="d-flex align-center">
								<v-avatar color="primary" size="x-small" class="mr-1">
									{{ step }}
								</v-avatar>
								<span class="text-body-2 d-flex">/ 3 ステップ</span>
							</span>
						</v-card-title>

						<v-window v-model="step">
							<v-window-item :value="1">
								<v-card-subtitle>
									アカウント情報を入力してください。
								</v-card-subtitle>
								<v-form ref="createUserForm">
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
										</v-row>
									</v-container>
								</v-form>
								<v-card-actions>
									<v-spacer></v-spacer>

									<v-btn color="success" @click="stepTo(2)">
										次へ
										<v-icon>mdi-chevron-right</v-icon>
									</v-btn>
								</v-card-actions>
							</v-window-item>

							<v-window-item :value="2">
								<v-card-subtitle>
									家計簿のグループを作成します。
								</v-card-subtitle>
								<v-card-text>
									<v-form ref="createGroupForm">
										<v-row>
											<v-col cols="12">
												<v-text-field
													v-model="groupName"
													label="グループ名"
													:rules="[(v) => !!v || 'Item is required']"
													validate-on="blur"
													variant="underlined"
												/>
											</v-col>
										</v-row>
									</v-form>
								</v-card-text>
								<v-card-actions>
									<v-spacer></v-spacer>

									<v-btn @click="stepTo(1)">
										<v-icon>mdi-chevron-left</v-icon>
										戻る
									</v-btn>
									<v-btn color="success" @click="register">
										登録を完了する
										<v-icon>mdi-chevron-right</v-icon>
									</v-btn>
								</v-card-actions>
							</v-window-item>

							<v-window-item :value="3">
								<v-card-text class="text-center">
									<v-progress-circular color="primary" indeterminate />
								</v-card-text>
							</v-window-item>
						</v-window>
					</v-card>
				</v-col>
			</v-row>
		</v-container>
	</v-main>
</template>
