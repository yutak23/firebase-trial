import functions from 'firebase-functions';
import admin from 'firebase-admin';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';
import lodash from 'lodash';
import { BigQuery } from '@google-cloud/bigquery';

const { omit } = lodash;
const isLocal = process.env.NODE_ENV === 'local';

admin.initializeApp();

const db = admin.firestore();
const bigquery = isLocal
	? new BigQuery({ apiEndpoint: 'http://localhost:9050' })
	: new BigQuery();

export const addMessage = functions
	.region('asia-northeast1')
	.https.onRequest(async (req, res) => {
		const original = req.query.text;

		const writeResult = await admin
			.firestore()
			.collection('messages')
			.add({ original });

		res.json({ result: `Message with ID: ${writeResult.id} added.` });
	});

export const makeUppercase = functions
	.region('asia-northeast1')
	.firestore.document('/messages/{documentId}')
	.onCreate((snap, context) => {
		const { original } = snap.data();
		functions.logger.log('Uppercasing', context.params.documentId, original);

		const uppercase = original.toUpperCase();
		return snap.ref.set({ uppercase }, { merge: true });
	});

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
			.doc(user.id);
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
				`userId: ${user.id}`
			);
			return null;
		}

		functions.logger.info(
			'add group member_users',
			`groupId: ${groupId}`,
			`userId: ${user.id}`
		);

		return groupMemberUsersDocRef.set(
			snakecaseKeys(omit(user, ['ownerGroupCount']))
		);
		// 以下の実装でも同じ
		// return db
		// 	.doc(`groups/${groupId}/member_users/${user.id}`)
		// 	.set(snakecaseKeys(omit(user, ['ownerGroupCount'])));
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
