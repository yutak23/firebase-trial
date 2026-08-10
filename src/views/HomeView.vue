<script setup>
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
	doc,
	collection,
	getDocs,
	setDoc,
	updateDoc,
	where,
	query,
	orderBy,
	deleteDoc
} from 'firebase/firestore';
import { DateTime } from 'luxon';
import snakecaseKeys from 'snakecase-keys';

import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

import { db } from '@/firebase';
import { converter } from '@/firebase/store';
import { fetchGroupMembers } from '@/service/group-service';
import { scanReceipt } from '@/service/receipt-service';
import { fileToResizedBase64 } from '@/utils/image';

const { t } = useI18n();
const props = defineProps({
	selectedGroup: { type: String, required: true, default: null }
});
console.log(props.selectedGroup);

const overlay = ref(false);
const displayLoading = () => {
	overlay.value = true;
};
const closeLoading = () => {
	overlay.value = false;
};

const bottomNavigation = ref(false);

const bookDataDialog = ref(false);
// ダイアログを開き直すたびに採番し、進行中のスキャンの結果を破棄するために使う
let formInstanceId = 0;
const scanning = ref(false);
const scanError = ref(null);
const datePickDialog = ref(false);
const datepicker = ref(null);
const openBookDataDialog = () => {
	formInstanceId += 1; // 進行中のスキャン結果を無効化する
	scanning.value = false;
	scanError.value = null;
	bookDataDialog.value = true;
	bottomNavigation.value = null;
};
const openDatePickDialog = () => {
	datePickDialog.value = true;
	setTimeout(() => {
		datepicker.value.openMenu();
	}, 20);
};
const onClickOutside = () => {};

const form = ref(null);
const book = reactive({
	id: null,
	date: new Date(),
	price: null,
	cateory: null,
	payer: null,
	memo: null
});
const memberUserList = reactive([]);
const groupUsers = reactive([]);
const dispalyDate = computed(() =>
	DateTime.fromJSDate(book.date).toFormat('yyyy-MM-dd')
);
const cateories = computed(() => [
	{
		id: 'food_expenses',
		title: t('groups.add_book_data_dialog.category.food_expenses'),
		value: 'food_expenses'
	},
	{
		id: 'commodity_expenses',
		title: t('groups.add_book_data_dialog.category.commodity_expenses'),
		value: 'commodity_expenses'
	},
	{
		id: 'medical_expense',
		title: t('groups.add_book_data_dialog.category.medical_expense'),
		value: 'medical_expense'
	},
	{
		id: 'clothing_expenses',
		title: t('groups.add_book_data_dialog.category.clothing_expenses'),
		value: 'clothing_expenses'
	},
	{
		id: 'transportation_expenses',
		title: t('groups.add_book_data_dialog.category.transportation_expenses'),
		value: 'transportation_expenses'
	},
	{
		id: 'rent_expenses',
		title: t('groups.add_book_data_dialog.category.rent_expenses'),
		value: 'rent_expenses'
	},
	{
		id: 'utilities_expense',
		title: t('groups.add_book_data_dialog.category.utilities_expense'),
		value: 'utilities_expense'
	},
	{
		id: 'maternity_baby_expense',
		title: t('groups.add_book_data_dialog.category.maternity_baby_expense'),
		value: 'maternity_baby_expense'
	},
	{
		id: 'another_expense',
		title: t('groups.add_book_data_dialog.category.another_expense'),
		value: 'another_expense'
	}
]);
const receiptInput = ref(null);
const openReceiptInput = () => {
	receiptInput.value.click();
};
// レシートを読み取ってフォームを埋めるだけで、登録はユーザーの操作に任せる
const onReceiptSelected = async (event) => {
	const file = event.target.files[0];
	receiptInput.value.value = ''; // 同じ写真を選び直せるようにする
	if (!file) return;

	// 解析中にダイアログを閉じて別のフォームを開かれた場合、
	// 遅れて届いた結果で今のフォームを書き換えないようにする
	const scanTarget = formInstanceId;
	const isStale = () => scanTarget !== formInstanceId || !bookDataDialog.value;

	scanning.value = true;
	scanError.value = null;
	try {
		const { imageBase64, mimeType } = await fileToResizedBase64(file);
		if (isStale()) return;

		const result = await scanReceipt({ imageBase64, mimeType });
		if (isStale()) return;

		// レシートとして何も読み取れなかった場合はフォームを書き換えない
		if (!result.price && !result.date && !result.storeName) {
			scanError.value = t('groups.add_book_data_dialog.receipt.not_found');
			return;
		}

		const scannedDate = result.date
			? DateTime.fromFormat(result.date, 'yyyy-MM-dd')
			: null;
		if (scannedDate && scannedDate.isValid) book.date = scannedDate.toJSDate();
		if (result.price) book.price = result.price;
		if (result.category) book.cateory = result.category;
		if (result.storeName && !book.memo) book.memo = result.storeName;

		if (!result.price)
			scanError.value = t('groups.add_book_data_dialog.receipt.not_found');
	} catch (e) {
		if (isStale()) return;
		console.error(e);
		scanError.value = t('groups.add_book_data_dialog.receipt.error');
	} finally {
		// 古いスキャンが後発スキャンのローディング状態を消さないようにする
		if (!isStale()) scanning.value = false;
	}
};

const create = () => {
	Object.keys(book).forEach((key) => {
		if (key === 'date') {
			book.date = new Date();
			return;
		}
		book[key] = null;
	});
	openBookDataDialog();
};

const groupMembers = await fetchGroupMembers({ groupId: props.selectedGroup });
groupMembers.forEach((v) => {
	const { id, firstName } = v;
	memberUserList.push({
		id,
		title: firstName,
		value: id
	});
	groupUsers.push({ id, firstName });
});
if (memberUserList.length > 1)
	memberUserList.push({
		id: 'joint',
		title: t('groups.add_book_data_dialog.member.joint'),
		value: 'joint'
	});

const nowDatetime = DateTime.local();
const selectedYear = ref(nowDatetime.year);
const selectedMonth = ref(nowDatetime.month);
const currentMonthBooks = reactive([]);
const displayPrice = computed(
	() => (number) =>
		new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: 'JPY'
		}).format(number)
);
const dispalyPayer = computed(() => (userId) => {
	const payerUser = groupUsers
		.filter((memberUser) => memberUser.id === userId)
		.shift();
	return payerUser ? payerUser.firstName : null;
});
const dispalyListDate = computed(
	() => (jsDate) => DateTime.fromJSDate(jsDate).toFormat('yyyy-MM-dd')
);
const getAllCurrentData = async (options = {}) => {
	if (options.loading) displayLoading();
	currentMonthBooks.length = 0;

	const groupsRef = collection(
		db,
		'groups',
		props.selectedGroup,
		'books'
	).withConverter(converter);
	const targetDatetime = DateTime.fromFormat(
		`${selectedYear.value}-${selectedMonth.value}`,
		'yyyy-M'
	);
	const q = query(
		groupsRef,
		where('date', '>=', targetDatetime.startOf('month').toJSDate()),
		where('date', '<=', targetDatetime.endOf('month').toJSDate()),
		orderBy('date')
	); // これでも where('date', '>=', Timestamp.fromDate(new Date('2023-04-19'))) と同じ
	const querySnapshot = await getDocs(q);
	querySnapshot.forEach((docData) => {
		console.log(docData.id, ' => ', docData.data());
		currentMonthBooks.push({ id: docData.id, ...docData.data() });
	});

	if (options.loading) closeLoading();
};
const edit = (v) => {
	book.id = v.id;
	book.date = v.date;
	book.price = v.price;
	book.cateory = v.cateory;
	book.payer = v.payer;
	book.memo = v.memo;

	openBookDataDialog();
};
const deleteData = async (v) => {
	displayLoading();

	await deleteDoc(doc(db, 'groups', props.selectedGroup, 'books', v.id));
	await getAllCurrentData({ loading: false });

	closeLoading();
};

const dialogOverlay = ref(false);
const displayDialogLoading = () => {
	dialogOverlay.value = true;
};
const closeDialogLoading = () => {
	dialogOverlay.value = false;
};
const register = async () => {
	const { valid } = await form.value.validate();

	if (valid) {
		displayDialogLoading();

		const data = {
			groupId: props.selectedGroup,
			date: book.date, // JS Dateでfirestore.Timestampに変換される
			price: Number.parseInt(book.price, 10),
			cateory: book.cateory,
			payer: book.payer,
			memo: book.memo
		};
		if (book.id)
			// updateDocではwithConverterが効かない https://github.com/firebase/firebase-js-sdk/issues/2842
			await updateDoc(
				doc(db, 'groups', props.selectedGroup, 'books', book.id),
				snakecaseKeys({ bookId: book.id, ...data })
			);
		else {
			const groupBookDocRef = doc(
				collection(db, 'groups', props.selectedGroup, 'books')
			).withConverter(converter);
			await setDoc(groupBookDocRef, { bookId: groupBookDocRef.id, ...data });
		}

		await getAllCurrentData({ loading: false });

		bookDataDialog.value = false;
		closeDialogLoading();
	}
};

await getAllCurrentData();
</script>

<template>
	<v-container>
		<v-overlay :model-value="overlay" class="align-center justify-center">
			<v-progress-circular color="primary" indeterminate size="64" />
		</v-overlay>

		<v-toolbar dense floating>
			<v-container>
				<v-row>
					<v-col cols="4">
						<v-select
							v-model="selectedYear"
							density="compact"
							hide-details
							hide-selected
							label="年"
							:items="['2020', '2021', '2022', '2023', '2024', '2025']"
							@update:modelValue="getAllCurrentData({ loading: true })"
						/>
					</v-col>
					<v-col cols="4">
						<v-select
							v-model="selectedMonth"
							density="compact"
							hide-details
							hide-selected
							label="月"
							:items="[...Array(12)].map((_, i) => i + 1)"
							@update:modelValue="getAllCurrentData({ loading: true })"
						/>
					</v-col>
				</v-row>
			</v-container>
		</v-toolbar>

		<v-list lines="three">
			<template v-for="(item, i) in currentMonthBooks" :key="i">
				<v-list-item class="pa-2">
					<template v-slot:prepend>
						<div style="width: 80px">
							<v-chip size="small">
								{{ $t(`groups.add_book_data_dialog.category.${item.cateory}`) }}
							</v-chip>
						</div>
					</template>

					<v-list-item-title class="pb-1 pl-2">
						{{ displayPrice(item.price) }}
					</v-list-item-title>
					<v-list-item-subtitle class="pb-1 pl-2">
						メモ : {{ item.memo }}
					</v-list-item-subtitle>
					<v-list-item-subtitle class="pl-2">
						<v-icon
							v-if="dispalyPayer(item.payer) !== null"
							icon="mdi-account-circle"
							theme="light"
						/>
						<v-icon v-else icon="mdi-account-multiple" theme="light" />

						<span v-if="dispalyPayer(item.payer) !== null" class="text-body-2">
							{{ dispalyPayer(item.payer) }}
						</span>
						<span v-else class="text-body-2">
							{{ $t('groups.add_book_data_dialog.member.joint') }}
						</span>
						<span class="ml-2">{{ dispalyListDate(item.date) }}</span>
					</v-list-item-subtitle>

					<template #append>
						<v-list-item-action>
							<v-btn size="x-small" icon="mdi-pencil" @click="edit(item)" />
							<v-btn
								class="ml-2"
								size="x-small"
								icon="mdi-delete"
								@click="deleteData(item)"
							/>
						</v-list-item-action>
					</template>
				</v-list-item>

				<v-divider v-if="currentMonthBooks.length - 1 > i" />
			</template>
		</v-list>

		<v-bottom-navigation v-model="bottomNavigation" density="compact">
			<v-btn @click="create">
				<v-icon>mdi-plus-circle</v-icon>
			</v-btn>
		</v-bottom-navigation>

		<v-dialog
			v-model="bookDataDialog"
			persistent
			fullscreen
			transition="dialog-bottom-transition"
		>
			<v-overlay
				:model-value="dialogOverlay"
				class="align-center justify-center"
			>
				<v-progress-circular color="primary" indeterminate size="64" />
			</v-overlay>
			<v-card>
				<v-card-title> 新しく家計簿に登録する </v-card-title>
				<v-card-text>
					<v-form ref="form">
						<v-row>
							<v-col cols="12" class="pb-0">
								<v-btn
									block
									variant="tonal"
									prepend-icon="mdi-camera"
									:loading="scanning"
									@click="openReceiptInput"
								>
									{{ $t('groups.add_book_data_dialog.receipt.button') }}
								</v-btn>
								<!-- スマホでカメラを直接起動するため v-file-input ではなく input を使う -->
								<input
									ref="receiptInput"
									type="file"
									accept="image/*"
									capture="environment"
									class="d-none"
									@change="onReceiptSelected"
								/>
								<v-alert
									v-if="scanError"
									type="warning"
									density="compact"
									variant="tonal"
									class="mt-2"
								>
									{{ scanError }}
								</v-alert>
							</v-col>
							<v-col cols="12">
								<v-text-field
									v-model="dispalyDate"
									label="日付"
									readonly
									variant="underlined"
									append-icon="mdi-calendar"
									@click:append="openDatePickDialog"
								/>
							</v-col>
							<v-col cols="12">
								<v-text-field
									v-model="book.price"
									type="number"
									label="金額"
									variant="underlined"
									:rules="[(v) => !!v || 'Item is required']"
									validate-on="blur"
									clearable
									:prefix="$t('groups.add_book_data_dialog.amount.prefix')"
								/>
							</v-col>
							<v-col cols="7">
								<v-select
									v-model="book.cateory"
									chips
									:items="cateories"
									item-title="title"
									item-value="value"
									label="カテゴリ"
									:rules="[(v) => !!v || 'Item is required']"
									validate-on="blur"
									clearable
								>
								</v-select>
							</v-col>
							<v-col cols="5">
								<v-select
									v-model="book.payer"
									chips
									:items="memberUserList"
									item-title="title"
									item-value="value"
									label="支払者"
									:rules="[(v) => !!v || 'Item is required']"
									validate-on="blur"
									clearable
								>
								</v-select>
							</v-col>
							<v-col cols="12" class="pb-1">
								<v-text-field
									v-model="book.memo"
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
					<v-btn @click="bookDataDialog = false"> キャンセル </v-btn>
					<v-btn color="success" @click="register">
						登録
						<v-icon icon="mdi-chevron-right" end></v-icon>
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<v-dialog v-model="datePickDialog" persistent width="300">
			<v-card height="450px">
				<v-card-text class="d-flex justify-center">
					<VueDatePicker
						ref="datepicker"
						v-model="book.date"
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

<style scoped lang="sass">
.v-bottom-navigation
	position: fixed !important
</style>
