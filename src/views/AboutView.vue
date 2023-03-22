<script setup>
import { RouterLink } from 'vue-router';
import HelloWorld from '@/components/HelloWorld.vue';
</script>

<template>
	<h1>This is an about page</h1>
	<img
		alt="Vue logo"
		class="logo"
		src="@/assets/logo.svg"
		width="125"
		height="125"
	/>

	<HelloWorld msg="You did it!" />

	<RouterLink to="/">Home</RouterLink>
</template>
