<script setup>
import { ref, reactive, computed, defineProps } from 'vue';
import { writeBatch, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import clone from 'lodash/clone';
import md5 from 'crypto-js/md5';
import { DateTime } from 'luxon';

import { db } from '@/firebase';
import { converter } from '@/firebase/store';
import { fetchUser } from '@/service/user-service';
import {
	fetchGroup,
	fetchGroupMembers,
	fetchGroupInvites
} from '@/service/group-service';

const props = defineProps({
	selectedGroup: { type: String, required: true, default: null }
});

const auth = getAuth();
const inviter = await fetchUser({ userId: auth.currentUser.uid });
const group = await fetchGroup({ groupId: props.selectedGroup });

const groupUsers = reactive([]);
const dispalyName = computed(
	() => (user) => `${user.lastName} ${user.firstName}`
);
const groupMembers = await fetchGroupMembers({ groupId: props.selectedGroup });
groupMembers.forEach((v) => {
	groupUsers.push(v);
});

const groupInvitesList = reactive([]);
const initiGroupInvitesList = async () => {
	const groupInvites = await fetchGroupInvites({
		groupId: props.selectedGroup
	});
	groupInvites.forEach((v) => {
		groupInvitesList.push(v);
	});
};
await initiGroupInvitesList();

const editGroupForm = ref(null);
const editableGroupName = ref(false);
const groupName = ref(group.name);
const editGroupName = async () => {
	const { valid } = await editGroupForm.value.validate();

	if (valid) {
		const groupDocRef = doc(db, 'groups', props.selectedGroup).withConverter(
			converter
		);
		await updateDoc(groupDocRef, { name: groupName.value });
		editableGroupName.value = false;
	}
};

const inviteDialog = ref(false);
const form = ref(null);
const rules = computed(() => (inviteUsers, index) => [
	(v) => !!v || 'Item is required',
	(v) => {
		const clonedInviteUsers = clone(inviteUsers);
		clonedInviteUsers.splice(index, 1); // 自要素を含まない配列

		return (
			inviteUsers.length === 1 ||
			!clonedInviteUsers.some((inviteUser) => inviteUser.email === v) ||
			'Duplicated email'
		);
	},
	(v) =>
		!groupUsers.some((groupUser) => groupUser.email === v) ||
		'Already group member'
]);
const inviteUsers = reactive([]);
const addMember = () => {
	inviteUsers.push({ email: '' });
};
const removeMember = (index) => {
	inviteUsers.splice(index, 1);
};
const invite = async () => {
	const { valid } = await form.value.validate();

	if (valid) {
		// TODO 招待の重複エラー時のエラーをハンドリングする
		// TODO Batchだと1件でもNGあると他もNGになるので、Promise.allに変更する
		const batch = writeBatch(db);
		inviteUsers.forEach((inviteUser) => {
			const docRef = doc(
				db,
				'groups',
				props.selectedGroup,
				'invites',
				md5(inviteUser.email).toString()
			).withConverter(converter);
			batch.set(docRef, {
				groupId: props.selectedGroup,
				groupName: group.name,
				invitedUserEmail: inviteUser.email,
				inviterUid: auth.currentUser.uid,
				inviterFirstName: inviter.firstName,
				inviterLastName: inviter.lastName,
				inviterLogoUri: inviter.logoUri,
				createdAt: DateTime.local().toUnixInteger()
			});
		});

		await batch.commit();
		await initiGroupInvitesList();
		inviteDialog.value = false;
	}
};

const openInviteDialog = () => {
	inviteUsers.length = 0;
	inviteDialog.value = true;
};
</script>

<template>
	<v-container>
		<v-row>
			<v-col>
				<v-card class="mb-4">
					<v-card-title>グループ名を変更</v-card-title>
					<v-card-text>
						<v-form ref="editGroupForm">
							<v-row>
								<v-col cols="12">
									<v-text-field
										v-model="groupName"
										label="グループ名"
										:rules="[(v) => !!v || 'Item is required']"
										validate-on="blur"
										variant="underlined"
										append-icon="mdi-pencil"
										:readonly="!editableGroupName"
										@click:append="editableGroupName = true"
									/>
								</v-col>
							</v-row>
						</v-form>
					</v-card-text>
					<v-card-actions>
						<v-spacer></v-spacer>
						<v-btn @click="editGroupName" :disabled="!editableGroupName">
							<template v-slot:prepend>
								<v-icon>mdi-account-multiple-plus</v-icon>
							</template>
							保存
						</v-btn>
					</v-card-actions>
				</v-card>
			</v-col>
		</v-row>

		<v-card class="mb-4">
			<v-card-title>グループのメンバー</v-card-title>
			<v-card-text>
				<v-list>
					<template v-for="(groupUser, i) in groupUsers" :key="i">
						<v-list-item>
							<template v-slot:prepend>
								<v-avatar>
									<v-img :src="groupUser.logoUri" />
								</v-avatar>
							</template>

							<v-list-item-title>
								{{ dispalyName(groupUser) }}
							</v-list-item-title>
							<v-list-item-subtitle>
								{{ groupUser.email }}
							</v-list-item-subtitle>
						</v-list-item>

						<v-divider inset v-if="groupUsers.length - 1 > i" />
					</template>
				</v-list>
			</v-card-text>
			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn @click="openInviteDialog">
					<template v-slot:prepend>
						<v-icon>mdi-account-multiple-plus</v-icon>
					</template>
					招待
				</v-btn>
			</v-card-actions>
		</v-card>

		<v-card>
			<v-card-title>招待中のメンバー</v-card-title>
			<v-card-text>
				<v-list>
					<template v-for="(groupInvite, i) in groupInvitesList" :key="i">
						<v-list-item>
							<v-list-item-title>
								{{ groupInvite.invitedUserEmail }}
							</v-list-item-title>

							<!-- TODO 招待取り消しを実装 -->
							<template v-slot:append>
								<v-btn disabled>取り消し</v-btn>
							</template>
						</v-list-item>

						<v-divider inset v-if="groupInvitesList.length - 1 > i" />
					</template>
				</v-list>
			</v-card-text>
		</v-card>

		<v-dialog v-model="inviteDialog" persistent fullscreen>
			<v-card>
				<v-card-title> メンバーを招待する </v-card-title>
				<v-card-subtitle>
					新たに一緒に家計簿を管理するメンバー： {{ inviteUsers.length }}人
				</v-card-subtitle>
				<v-card-text>
					<v-form ref="form">
						<v-row>
							<v-col cols="12" class="pb-0">
								<v-text-field
									v-for="(inviteUser, i) of inviteUsers"
									:key="i"
									v-model="inviteUser.email"
									:label="`${i + 1}人目`"
									variant="underlined"
									clearable
									:rules="rules(inviteUsers, i)"
									validate-on="blur"
									append-icon="mdi-delete"
									@click:append="removeMember(i)"
									@blur="form.validate()"
								/>
							</v-col>
							<v-col cols="12" class="py-1 d-flex">
								<v-spacer />
								<v-btn
									@click="addMember"
									icon="mdi-plus"
									color="primary"
									size="small"
								/>
							</v-col>
						</v-row>
					</v-form>
				</v-card-text>
				<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn @click="inviteDialog = false"> キャンセル </v-btn>
					<v-btn
						color="success"
						:disabled="!inviteUsers.length"
						@click="invite"
					>
						招待
						<v-icon icon="mdi-chevron-right" end></v-icon>
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</v-container>
</template>

<style scoped lang="sass"></style>
