<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
	<v-app>
		<v-app-bar density="compact">
			<template v-slot:prepend>
				<v-app-bar-nav-icon></v-app-bar-nav-icon>
			</template>

			<v-img src="@/assets/logo.svg"></v-img>

			<v-app-bar-title class="photos">{{ $t('app.title') }}</v-app-bar-title>

			<template v-slot:append>
				<v-btn icon="mdi-dots-vertical"></v-btn>
			</template>
		</v-app-bar>

		<v-main>
			<HelloWorld msg="You did it!" />

			<RouterLink to="/about">About</RouterLink>
		</v-main>
	</v-app>
</template>

<style lang="sass" scoped>
.photos
	color: red
</style>
