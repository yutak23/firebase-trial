import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';

const authenticate = (store) =>
	new Promise((resolve) => {
		onAuthStateChanged(auth, (user) => {
			if (user) {
				const { uid: id, email } = user;
				store.updateUser({ id, email });
				resolve(user);
			} else {
				store.$reset();
				resolve(null);
			}
		});
	});

// eslint-disable-next-line import/prefer-default-export
export { authenticate };
