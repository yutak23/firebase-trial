// eslint-disable-next-line import/no-unresolved
import * as functions from 'firebase-functions/v1';
import admin from 'firebase-admin';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';
import lodash from 'lodash';
// eslint-disable-next-line import/extensions
import md5 from 'crypto-js/md5.js';
import { BigQuery } from '@google-cloud/bigquery';
import { GoogleGenAI, Type } from '@google/genai';

const { omit } = lodash;
const isLocal = process.env.NODE_ENV === 'local';

admin.initializeApp();

const db = admin.firestore();
const bigquery = isLocal
	? new BigQuery({ apiEndpoint: 'http://localhost:9050' })
	: new BigQuery();

const converter = {
	toFirestore(obj) {
		return snakecaseKeys(obj);
	},
	fromFirestore(snapshot, options) {
		const data = snapshot.data(options);

		Object.keys(data).forEach((key) => {
			if (key === 'date') data.date = data.date.toDate();
		});
		return camelcaseKeys(data);
	}
};

export const createGroupMemberUsers = functions
	.region('asia-northeast1')
	.firestore.document('/groups/{documentId}')
	.onCreate(async (snap, context) => {
		const {
			params: { documentId: groupId }
		} = context;
		const { createdBy } = camelcaseKeys(snap.data());

		const userDocRef = db.collection('users').doc(createdBy);
		const userSnapshot = await new Promise((resolve, reject) => {
			userDocRef
				.get()
				.then((v) => {
					resolve(v);
				})
				.catch((e) => {
					reject(e);
				});
		});
		const user = camelcaseKeys(userSnapshot.data());

		const groupMemberUsersDocRef = db
			.collection('groups')
			.doc(groupId)
			.collection('member_users')
			.doc(md5(user.email).toString());
		const groupMemberUsersSnapshot = await new Promise((resolve, reject) => {
			groupMemberUsersDocRef
				.get()
				.then((v) => {
					resolve(v);
				})
				.catch((e) => {
					reject(e);
				});
		});

		// DBへのアクセス削減のためのチェック（冪等にはなっているのでこの分岐なしでも問題はない）
		if (groupMemberUsersSnapshot.exists) {
			functions.logger.info(
				'[skip] add group member_users',
				`groupId: ${groupId}`,
				`userId: ${md5(user.email).toString()}`
			);
			return null;
		}

		functions.logger.info(
			'add group member_users',
			`groupId: ${groupId}`,
			`userId: ${md5(user.email).toString()}`
		);

		return groupMemberUsersDocRef.set(
			snakecaseKeys(omit(user, ['ownerGroupCount']))
		);
		// 以下の実装でも同じ
		// return db
		// 	.doc(`groups/${groupId}/member_users/${user.id}`)
		// 	.set(snakecaseKeys(omit(user, ['ownerGroupCount'])));
	});

export const replyInvite = functions
	.region('asia-northeast1')
	.runWith({ enforceAppCheck: true })
	.https.onCall(async (data, context) => {
		if (context.app === undefined) {
			throw new functions.https.HttpsError(
				'failed-precondition',
				'The function must be called from an App Check verified app.'
			);
		}

		// TODO middlewareのような処理で大体可能か？調査
		if (
			!('groupId' in data) ||
			!('inviteId' in data) ||
			!('type' in data) ||
			!['accept', 'reject'].includes(data.type)
		)
			throw new functions.https.HttpsError(
				'invalid-argument',
				'invalid request.'
			);

		const { groupId, inviteId, type } = data;
		const {
			token: { uid, email }
		} = context.auth;

		if (inviteId !== md5(email).toString())
			throw new functions.https.HttpsError('not-found', 'invite not found');

		const groupInviteRef = db
			.collection('groups')
			.doc(groupId)
			.collection('invites')
			.doc(inviteId)
			.withConverter(converter);
		const groupInvitesSnap = await groupInviteRef.get();

		if (!groupInvitesSnap.exists)
			throw new functions.https.HttpsError('not-found', 'invite not found');

		if (type === 'accept') {
			try {
				await db.runTransaction(async (t) => {
					const userRef = await db
						.collection('users')
						.doc(uid)
						.withConverter(converter);
					const usersSnap = await t.get(userRef);
					const user = usersSnap.data();

					const groupMemberUsersDocRef = db
						.collection('groups')
						.doc(groupId)
						.collection('member_users')
						.doc(md5(email).toString())
						.withConverter(converter);
					await t.create(
						groupMemberUsersDocRef,
						snakecaseKeys(omit(user, ['ownerGroupCount']))
					);

					await t.delete(groupInviteRef, { exists: true });

					const groupInviteHistoryRef = db
						.collection('groups')
						.doc(groupId)
						.collection('invite_histories')
						.doc()
						.withConverter(converter);
					await t.create(groupInviteHistoryRef, {
						...groupInvitesSnap.data(),
						status: 'accept'
					});
				});

				functions.logger.info(
					'accept transaction success',
					`groupId: ${groupId}`,
					`invitedUserEmail: ${email}`
				);
			} catch (e) {
				// TODO エラー時の実装を修正
				functions.logger.error(
					'accept transaction failure',
					`groupId: ${groupId}`,
					`invitedUserEmail: ${email}`,
					e
				);
			}

			return { type };
		}

		// TODO rejectの場合を実装

		return { type };
	});

// レシート画像から家計簿の入力内容を推定する
const RECEIPT_MODEL = 'gemini-2.5-flash';
const RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const RECEIPT_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const RECEIPT_CATEGORIES = [
	'food_expenses',
	'commodity_expenses',
	'medical_expense',
	'clothing_expenses',
	'transportation_expenses',
	'rent_expenses',
	'utilities_expense',
	'maternity_baby_expense',
	'another_expense'
];
const RECEIPT_PROMPT = `あなたは日本語のレシートを読み取るアシスタントです。
添付されたレシート画像から以下の情報を抽出し、JSONで返してください。

- totalPrice: 実際に支払った金額（円、整数）。
  「合計」「お買上計」「税込合計」などの行を採用すること。
  「小計」「課税対象額」「お預り」「お釣り」「ポイント」は採用しないこと。
  クーポンや値引きが適用されている場合は、値引き後の実支払額を採用すること。
  画像がレシートではない、または金額が読み取れない場合は 0 にすること。
- date: レシートの発行日を yyyy-MM-dd 形式で。読み取れない場合は空文字にすること。
  和暦の場合は西暦に変換すること。
- storeName: 店舗の屋号のみ。支店名・住所・電話番号・法人格は含めないこと。
  読み取れない場合は空文字にすること。
- category: 購入内容から最も近いものを次のIDから1つだけ選ぶこと。
  food_expenses（食費）, commodity_expenses（日用品費）, medical_expense（医療費）,
  clothing_expenses（服飾費）, transportation_expenses（交通費）, rent_expenses（家賃）,
  utilities_expense（水道光熱費）, maternity_baby_expense（妊婦/Baby費）,
  another_expense（その他）
  判断できない場合は another_expense にすること。`;

// デプロイ時のソース解析ではシークレットが注入されないため、
// モジュール読み込み時ではなく最初の呼び出し時にクライアントを生成する
let genAi = null;
const getGenAi = () => {
	if (!genAi) genAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
	return genAi;
};

// クエリパラメータのAPIキーなど、詳細を返す際に漏れると困る値を伏せる
const redactSecrets = (message) =>
	message.replace(/(key|token|apikey|api_key)=[^&\s"']+/gi, '$1=***');

// 画面側で原因を切り分けられるよう、機微情報を含まない範囲でエラーの概要を返す
const toErrorDetail = (stage, e, extra = {}) => ({
	stage,
	name: typeof e?.name === 'string' ? e.name : 'Error',
	status: e?.status ?? e?.code ?? null,
	message:
		typeof e?.message === 'string'
			? redactSecrets(e.message).slice(0, 500)
			: '',
	...extra
});

// モデルの出力は信用せず、アプリが扱える値に丸めてから返す
const sanitizeReceipt = (parsed) => {
	const price =
		Number.isInteger(parsed.totalPrice) && parsed.totalPrice > 0
			? parsed.totalPrice
			: null;

	const date =
		typeof parsed.date === 'string' &&
		/^\d{4}-\d{2}-\d{2}$/.test(parsed.date) &&
		!Number.isNaN(new Date(parsed.date).getTime())
			? parsed.date
			: null;

	const storeName =
		typeof parsed.storeName === 'string' && parsed.storeName.trim() !== ''
			? parsed.storeName.trim().slice(0, 100)
			: null;

	const category = RECEIPT_CATEGORIES.includes(parsed.category)
		? parsed.category
		: 'another_expense';

	return { date, storeName, price, category };
};

export const scanReceipt = functions
	.region('asia-northeast1')
	.runWith({
		enforceAppCheck: true,
		secrets: ['GEMINI_API_KEY'],
		memory: '512MB',
		timeoutSeconds: 60
	})
	.https.onCall(async (data, context) => {
		// エミュレータではApp Checkが検証されずcontext.appがundefinedになる
		if (!isLocal && context.app === undefined) {
			throw new functions.https.HttpsError(
				'failed-precondition',
				'The function must be called from an App Check verified app.'
			);
		}

		if (!context.auth)
			throw new functions.https.HttpsError(
				'unauthenticated',
				'The function must be called while authenticated.'
			);

		if (
			!('imageBase64' in data) ||
			typeof data.imageBase64 !== 'string' ||
			data.imageBase64 === '' ||
			!('mimeType' in data) ||
			!RECEIPT_MIME_TYPES.includes(data.mimeType)
		)
			throw new functions.https.HttpsError(
				'invalid-argument',
				'invalid request.'
			);

		const { imageBase64, mimeType } = data;

		// base64は元データの約4/3の長さになる
		if ((imageBase64.length * 3) / 4 > RECEIPT_MAX_IMAGE_BYTES)
			throw new functions.https.HttpsError(
				'invalid-argument',
				'image is too large.'
			);

		let response;
		try {
			response = await getGenAi().models.generateContent({
				model: RECEIPT_MODEL,
				contents: [
					{ inlineData: { data: imageBase64, mimeType } },
					{ text: RECEIPT_PROMPT }
				],
				config: {
					responseMimeType: 'application/json',
					responseSchema: {
						type: Type.OBJECT,
						properties: {
							date: { type: Type.STRING },
							storeName: { type: Type.STRING },
							totalPrice: { type: Type.INTEGER },
							category: { type: Type.STRING }
						},
						required: ['date', 'storeName', 'totalPrice', 'category'],
						propertyOrdering: ['date', 'storeName', 'totalPrice', 'category']
					}
				}
			});
		} catch (e) {
			// 画像や抽出結果自体はログに残さない
			functions.logger.error('scanReceipt gemini failure', e);
			throw new functions.https.HttpsError(
				'internal',
				'failed to call the model.',
				toErrorDetail('gemini', e, { model: RECEIPT_MODEL })
			);
		}

		let parsed;
		try {
			parsed = JSON.parse(response.text);
		} catch (e) {
			// 安全性フィルタやトークン上限で本文が空になることがあるため、
			// 応答自体は残さず切り分けに必要な情報だけを返す
			functions.logger.error('scanReceipt parse failure', e);
			throw new functions.https.HttpsError(
				'internal',
				'failed to parse the model response.',
				toErrorDetail('parse', e, {
					finishReason: response?.candidates?.[0]?.finishReason ?? null,
					blockReason: response?.promptFeedback?.blockReason ?? null,
					textLength:
						typeof response?.text === 'string' ? response.text.length : 0
				})
			);
		}

		const result = sanitizeReceipt(parsed);

		functions.logger.info(
			'scanReceipt success',
			`uid: ${context.auth.uid}`,
			`detected: ${result.price !== null}`
		);

		return result;
	});

// 検証用 テンポラリー
export const testQuery = functions
	.region('asia-northeast1')
	.https.onRequest(async (req, res) => {
		const [result] = await bigquery.query({
			query: `SELECT * FROM firestore_export.users_raw_latest`
		});
		functions.logger.log(
			`SELECT * FROM firestore_export.users_raw_latest`,
			result
		);

		res.json({ result });
	});
