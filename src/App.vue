<script setup>
import { ref } from 'vue';
import { RouterView } from 'vue-router';

const overlay = ref(true);
const displayLoading = () => {
	overlay.value = true;
};
const closeLoading = () => {
	overlay.value = false;
};
</script>

<template>
	<v-app>
		<!-- https://tech.yappli.io/entry/suspense-with-routerview -->
		<RouterView v-slot="{ Component }">
			<Suspense timeout="0" @resolve="closeLoading" @pending="displayLoading">
				<template #default>
					<component :is="Component" />
				</template>

				<template #fallback>
					<v-overlay :model-value="overlay" class="align-center justify-center">
						<v-progress-circular color="primary" indeterminate size="64" />
					</v-overlay>
				</template>
			</Suspense>
		</RouterView>
	</v-app>
</template>
