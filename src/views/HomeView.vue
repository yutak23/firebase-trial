<script setup>
import { useRouter, RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/firebase';
import { converter } from '@/firebase/store';
import useUserStore from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

if (user.value.uid) {
	const userDocSnap = await getDoc(
		doc(db, 'users', user.value.uid).withConverter(converter)
	);
	if (!userDocSnap.exists()) router.push({ name: 'welcome', params: {} });
}
</script>

<template>
	<v-container class="fill-height">
		<v-row>
			<v-col>
				<HelloWorld msg="You did it!" />
				<RouterLink to="/welcome">Welcome</RouterLink>
			</v-col>
		</v-row>
	</v-container>
</template>

<style lang="sass" scoped>
.photos
	color: red
</style>
