import { httpsCallable } from 'firebase/functions';

import { functions } from '@/firebase';

const scanReceiptFunc = httpsCallable(functions, 'scanReceipt');

// { date, storeName, price, category } を返す
// model は未指定ならCloud Functions側の既定モデルが使われる
const scanReceipt = async ({ imageBase64, mimeType, model }) => {
	const { data } = await scanReceiptFunc({ imageBase64, mimeType, model });
	return data;
};

// eslint-disable-next-line import/prefer-default-export
export { scanReceipt };
