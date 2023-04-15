<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { collection, getDocs } from 'firebase/firestore';
import { DateTime } from 'luxon';
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

import { db } from '@/firebase';
import { converter } from '@/firebase/store';

const { t } = useI18n();
const router = useRouter();
const {
	params: { groupId }
} = router.currentRoute.value;

const bottomNavigation = ref(false);

const addbookDataDialog = ref(false);
const datePickDialog = ref(false);
const datepicker = ref(null);
const openAddbookDataDialog = () => {
	addbookDataDialog.value = true;
	bottomNavigation.value = null;
};
const openDialog = () => {
	datePickDialog.value = true;
	setTimeout(() => {
		datepicker.value.openMenu();
	}, 20);
};
const onClickOutside = () => {};

const form = ref(null);
const date = ref(new Date());
const price = ref(null);
const cateory = ref(null);
const payer = ref(null);
const memo = ref(null);
const memberUsers = reactive([]);
const dispalyDate = computed(() =>
	DateTime.fromJSDate(date.value).toFormat('yyyy-MM-dd')
);
const cateories = computed(() => [
	{
		id: 'food_cost',
		title: t('groups.add_book_data_dialog.category.food_cost'),
		value: 'food_cost'
	}
]);
const update = () => {
	console.log(cateory);
};

const memberUsersRef = collection(
	db,
	'groups',
	groupId,
	'member_users'
).withConverter(converter);
const memberUsersSnaps = await getDocs(memberUsersRef);
memberUsersSnaps.forEach((snap) => {
	console.log(snap.id, snap.data());
	const { id, firstName } = snap.data();
	memberUsers.push({
		id,
		title: firstName,
		value: id
	});
});
</script>

<template>
	<v-container>
		aaa
		<v-bottom-navigation v-model="bottomNavigation" density="compact">
			<v-btn @click="openAddbookDataDialog">
				<v-icon>mdi-book-plus</v-icon>
				追加
			</v-btn>
		</v-bottom-navigation>

		<v-dialog v-model="addbookDataDialog" persistent fullscreen>
			<v-card>
				<v-card-title> 新しく家計簿に登録する </v-card-title>
				<v-card-text>
					<v-form ref="form">
						<v-row>
							<v-col cols="12">
								<v-text-field
									v-model="dispalyDate"
									label="日付"
									readonly
									variant="underlined"
									append-icon="mdi-calendar"
									@click:append="openDialog"
								/>
							</v-col>
							<v-col cols="12">
								<v-text-field
									v-model="price"
									label="金額"
									variant="underlined"
									:rules="[(v) => !!v || 'Item is required']"
									validate-on="blur"
									clearable
									:prefix="$t('groups.add_book_data_dialog.amount.prefix')"
								/>
							</v-col>
							<v-col cols="6">
								<v-select
									v-model="cateory"
									chips
									:items="cateories"
									item-title="title"
									item-value="value"
									label="カテゴリ"
									:rules="[(v) => !!v || 'Item is required']"
									validate-on="blur"
									clearable
									@update:model-value="update"
								>
								</v-select>
							</v-col>
							<v-col cols="6">
								<v-select
									v-model="payer"
									chips
									:items="memberUsers"
									item-title="title"
									item-value="value"
									label="支払者"
									:rules="[(v) => !!v || 'Item is required']"
									validate-on="blur"
									clearable
									@update:model-value="update"
								>
								</v-select>
							</v-col>
							<v-col cols="12" class="pb-1">
								<v-text-field
									v-model="memo"
									label="メモ"
									variant="underlined"
									clearable
								/>
							</v-col>
						</v-row>
					</v-form>
				</v-card-text>
				<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn color="success" @click="register">
						登録
						<v-icon icon="mdi-chevron-right" end></v-icon>
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<v-dialog v-model="datePickDialog" persistent width="300">
			<v-card height="360px">
				<v-card-text class="d-flex justify-center">
					<VueDatePicker
						ref="datepicker"
						v-model="date"
						:locale="$i18n.locale"
						:enable-time-picker="false"
						:on-click-outside="onClickOutside"
						format="yyyy-MM-dd"
						:clearable="false"
						auto-apply
						teleport
						position="center"
						style="width: 200px"
						@closed="datePickDialog = false"
					/>
				</v-card-text>
			</v-card>
		</v-dialog>
	</v-container>
</template>
