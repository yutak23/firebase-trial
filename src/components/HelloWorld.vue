<script setup>
defineProps({
	msg: {
		type: String,
		required: true
	}
});
</script>

<template>
	<div>
		<h1 class="bg-green">{{ msg }}</h1>
	</div>
</template>

<style scoped lang="scss"></style>
