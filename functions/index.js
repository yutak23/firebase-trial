import functions from 'firebase-functions';
import admin from 'firebase-admin';

admin.initializeApp();

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
