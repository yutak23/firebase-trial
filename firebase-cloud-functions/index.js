import functions from 'firebase-functions';
import admin from 'firebase-admin';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';
import lodash from 'lodash';
// eslint-disable-next-line import/extensions
import md5 from 'crypto-js/md5.js';
import { BigQuery } from '@google-cloud/bigquery';

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
