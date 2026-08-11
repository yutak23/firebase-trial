<script setup>
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';

import { AI_MODELS } from '@/constants/ai-model';
import useSettingsStore from '@/stores/settings';

const settingsStore = useSettingsStore();
const { updateAiModel } = settingsStore;
const { aiModel } = storeToRefs(settingsStore);

// v-radio-group の変更をそのままストアに書かず、保存の成否を出せるように受け取る
const selectedAiModel = ref(aiModel.value);
const models = computed(() => AI_MODELS);
const saved = ref(false);

const changeAiModel = (model) => {
	updateAiModel(model);
	// 保存済みの値に戻す（未対応のモデルが選ばれた場合は既定値に丸められる）
	selectedAiModel.value = aiModel.value;
	saved.value = true;
};
</script>

<template>
	<v-container>
		<v-card class="mb-4">
			<v-card-title>{{ $t('settings.ai_model.title') }}</v-card-title>
			<v-card-subtitle class="text-wrap">
				{{ $t('settings.ai_model.description') }}
			</v-card-subtitle>
			<v-card-text>
				<v-radio-group
					:model-value="selectedAiModel"
					hide-details
					@update:modelValue="changeAiModel"
				>
					<v-radio
						v-for="model in models"
						:key="model.id"
						:value="model.id"
						class="mb-2"
					>
						<template v-slot:label>
							<div>
								<div>
									{{ $t(`settings.ai_model.models.${model.key}.title`) }}
								</div>
								<div class="text-caption text-medium-emphasis">
									{{ $t(`settings.ai_model.models.${model.key}.description`) }}
								</div>
								<div class="text-caption text-medium-emphasis">
									{{ model.id }}
								</div>
							</div>
						</template>
					</v-radio>
				</v-radio-group>
			</v-card-text>
		</v-card>

		<v-snackbar v-model="saved" :timeout="2000">
			{{ $t('settings.saved') }}
		</v-snackbar>
	</v-container>
</template>
