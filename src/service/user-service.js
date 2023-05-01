import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/firebase';
import { converter } from '@/firebase/store';

const fetchUser = async () => {
	const auth = getAuth();

	const userDocSnap = await getDoc(
		doc(db, 'users', auth.currentUser.uid).withConverter(converter)
	);

	if (!userDocSnap.exists()) return null;
	return userDocSnap.data();
};

// eslint-disable-next-line import/prefer-default-export
export { fetchUser };
