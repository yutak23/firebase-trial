import { httpsCallable } from 'firebase/functions';

import { functions } from '@/firebase';

const scanReceiptFunc = httpsCallable(functions, 'scanReceipt');

// { date, storeName, price, category } を返す
const scanReceipt = async ({ imageBase64, mimeType }) => {
	const { data } = await scanReceiptFunc({ imageBase64, mimeType });
	return data;
};

// eslint-disable-next-line import/prefer-default-export
export { scanReceipt };
