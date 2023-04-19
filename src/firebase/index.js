import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import {
	initializeAppCheck,
	ReCaptchaV3Provider,
	getToken
} from 'firebase/app-check';

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
	measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
if (import.meta.env.MODE === 'localdev')
	connectAuthEmulator(auth, 'http://localhost:9099');

const db = getFirestore(app);
if (import.meta.env.MODE === 'localdev')
	connectFirestoreEmulator(db, 'localhost', 8084);

if (import.meta.env.DEV) window.self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
const appCheck = initializeAppCheck(app, {
	provider: new ReCaptchaV3Provider(
		import.meta.env.VITE_FIREBASE_RECAPTCHA_SITEKEY
	),
	isTokenAutoRefreshEnabled: true
});
getToken(appCheck)
	.then(() => {
		console.log('AppCheck:Success');
	})
	.catch((error) => {
		console.log(error.message);
	});

const analytics = getAnalytics(app);

export { auth, db, analytics };
