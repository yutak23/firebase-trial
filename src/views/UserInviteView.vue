<script setup>
import { ref, reactive, computed } from 'vue';
// import { useRouter } from 'vue-router';
// import { storeToRefs } from 'pinia';
// import {
// doc,
// getDoc,
// collection,
// runTransaction,
// query,
// collectionGroup,
// where,
// getDocs
// } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { strict as assert } from 'node:assert';

import { functions } from '@/firebase';
import { fetchMyInvites } from '@/service/group-service';
// import { converter } from '@/firebase/store';
// import useUserStore from '@/stores/user';

// const router = useRouter();

const auth = getAuth();

const loading = ref(false);
const inviteItems = reactive([]);
const totalItems = ref(0);
const headers = computed(() => [
	{
		title: 'グループ名',
		align: 'start',
		sortable: false,
		key: 'groupName',
		width: 115
	},
	{
		title: '招待者',
		sortable: false,
		key: 'inviterInfo',
		width: 325
	},
	{
		title: 'ステータス',
		align: 'center',
		sortable: false,
		key: 'actions',
		width: 115
	}
]);
const inviterName = computed(
	() => (item) => `${item.raw.inviterLastName} ${item.raw.inviterFirstName}`
);

const fetchInvites = async () => {
	inviteItems.length = 0;

	const invites = await fetchMyInvites({ email: auth.currentUser.email });
	invites.forEach((invite) => {
		inviteItems.push(invite);
	});
};

const confirmDialog = ref(false);
const replyData = reactive({ groupId: null, inviteId: null, type: null });
const isAccept = computed(() => replyData.type === 'accept');
const openConfirmDialog = (options = {}) => {
	assert.ok(options.inviteId, 'inviteId must be required');
	assert.ok(options.type, 'type must be required');
	const { groupId, inviteId, type } = options;

	replyData.groupId = groupId;
	replyData.inviteId = inviteId;
	replyData.type = type;

	confirmDialog.value = true;
};
const closeConfirmDialog = () => {
	confirmDialog.value = false;
};

const replyInviteFunc = httpsCallable(functions, 'replyInvite');
const replyInvite = async () => {
	await replyInviteFunc(replyData);
	await fetchInvites();
	closeConfirmDialog();
};
</script>

<template>
	<v-container>
		<!-- https://github.com/vuetifyjs/vuetify/blob/12b01f0c2d722f542e509a408b2b04065c07f95a/packages/vuetify/src/locale/ja.ts -->
		<v-data-table-server
			items-per-page="5"
			:headers="headers"
			:items-length="totalItems"
			:items="inviteItems"
			:loading="loading"
			item-title="groupName"
			item-value="id"
			class="elevation-1"
			@update:options="fetchInvites"
		>
			<template v-slot:top>
				<v-toolbar density="compact">
					<v-toolbar-title>招待一覧</v-toolbar-title>
				</v-toolbar>
			</template>
			<template #item.inviterInfo="{ item }">
				<v-list-item
					:title="inviterName(item)"
					:subtitle="item.raw.invitedUserEmail"
					class="pa-0"
				>
					<template v-slot:prepend>
						<v-avatar size="small">
							<v-img :src="item.raw.inviterLogoUri" />
						</v-avatar>
					</template>
				</v-list-item>
			</template>
			<template #item.actions="{ item }">
				<v-icon
					color="success"
					@click="
						openConfirmDialog({
							groupId: item.raw.groupId,
							inviteId: item.value,
							type: 'accept'
						})
					"
				>
					mdi-arrow-left-bold-circle-outline
				</v-icon>
				<v-icon
					class="ml-4"
					@click="openConfirmDialog({ inviteId: item.value, type: 'reject' })"
				>
					mdi-cancel
				</v-icon>
			</template>
		</v-data-table-server>

		<v-dialog
			v-model="confirmDialog"
			persistent
			transition="dialog-bottom-transition"
			max-width="600px"
		>
			<v-card>
				<v-card-title>
					{{ $t(`accounts.invites.confirm_dialog.title.${replyData.type}`) }}
				</v-card-title>
				<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn @click="confirmDialog = false"> キャンセル </v-btn>

					<v-btn :color="isAccept ? 'success' : 'error'" @click="replyInvite">
						{{ $t(`accounts.invites.confirm_dialog.${replyData.type}`) }}
						<v-icon v-if="isAccept" end>
							mdi-arrow-left-bold-circle-outline
						</v-icon>
						<v-icon v-else end> mdi-cancel </v-icon>
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</v-container>
</template>
