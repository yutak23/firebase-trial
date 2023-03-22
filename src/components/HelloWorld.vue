<script setup>
defineProps({
	msg: {
		type: String,
		required: true
	}
});
</script>

<template>
	<h1 class="bg-green">{{ msg }}</h1>
</template>

<style scoped lang="scss"></style>
