<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import {
	doc,
	getDoc,
	collection,
	runTransaction,
	query,
	collectionGroup,
	where,
	getDocs
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import snakecaseKeys from 'snakecase-keys';

import { db } from '@/firebase';
import { converter } from '@/firebase/store';
import useUserStore from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const { updateUser } = userStore;
const { user } = storeToRefs(userStore);

const groups = reactive([]);
// TODO https://firebase.google.com/docs/firestore/query-data/listen?hl=ja#listen_to_multiple_documents_in_a_collection を利用した実装を試す
const getGroups = async () => {
	groups.length = 0;
	const groupDocPaths = [];
	const members = query(
		collectionGroup(db, 'member_users'),
		where('id', '==', user.value.id)
	);
	const querySnapshots = await getDocs(members);
	querySnapshots.forEach((querySnapshot) => {
		groupDocPaths.push(querySnapshot.ref.parent.parent.path);
	});

	await Promise.all(
		groupDocPaths.map(async (groupDocPath) => {
			const groupRef = doc(db, groupDocPath).withConverter(converter);
			const groupSnap = await getDoc(groupRef);
			groups.push({ id: groupRef.id, ...groupSnap.data() });
		})
	);
};

if (user.value.id) {
	const userDocSnap = await getDoc(
		doc(db, 'users', user.value.id).withConverter(converter)
	);
	if (!userDocSnap.exists()) router.push({ name: 'welcome', params: {} });

	updateUser(userDocSnap.data());
	await getGroups();
}

const bottomNavigation = ref(false);
const createGroupDialog = ref(false);
const openCreateGroupDialog = () => {
	createGroupDialog.value = true;
	bottomNavigation.value = null;
};

const form = ref(null);
const groupName = ref('');
const createGroup = async () => {
	const { valid } = await form.value.validate();

	if (valid) {
		const auth = getAuth();
		const userDocRef = doc(db, 'users', auth.currentUser.uid);

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
							auth.currentUser.uid
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

		form.value.reset();

		await getGroups();
		createGroupDialog.value = false;
	}
};
</script>

<template>
	<v-container>
		<v-row>
			<v-col
				cols="12"
				sm="6"
				md="4"
				lg="4"
				xl="4"
				v-for="group of groups"
				:key="group.id"
			>
				<v-card :to="`/groups/${group.id}`">
					<v-card-title>{{ group.name }}</v-card-title>
				</v-card>
			</v-col>
		</v-row>

		<v-bottom-navigation v-model="bottomNavigation" density="compact">
			<v-btn @click="openCreateGroupDialog" :disabled="!(groups.length <= 5)">
				<v-icon>mdi-book-plus</v-icon>
				追加
			</v-btn>
		</v-bottom-navigation>

		<v-dialog v-model="createGroupDialog" persistent fullscreen>
			<v-card>
				<v-card-title>グループを作成</v-card-title>
				<v-form ref="form">
					<v-container>
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
					</v-container>
				</v-form>
				<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn @click="createGroupDialog = false"> キャンセル </v-btn>

					<v-btn color="success" @click="createGroup">
						作成
						<v-icon icon="mdi-chevron-right" end></v-icon>
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</v-container>
</template>
