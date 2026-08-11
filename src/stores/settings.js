import { defineStore } from 'pinia';

import { DEFAULT_AI_MODEL, isSupportedAiModel } from '@/constants/ai-model';

const AI_MODEL_STORAGE_KEY = 'settings.aiModel';

// プライベートブラウジングなどで localStorage が使えないことがあるため、
// 読み書きに失敗しても既定値で動作を続ける
const loadAiModel = () => {
	try {
		const stored = window.localStorage.getItem(AI_MODEL_STORAGE_KEY);
		// 提供が終わったモデルが残っている場合もあるため、既知のものだけ採用する
		return isSupportedAiModel(stored) ? stored : DEFAULT_AI_MODEL;
	} catch (e) {
		console.warn('failed to read the ai model setting.', e);
		return DEFAULT_AI_MODEL;
	}
};

const saveAiModel = (model) => {
	try {
		window.localStorage.setItem(AI_MODEL_STORAGE_KEY, model);
	} catch (e) {
		console.warn('failed to persist the ai model setting.', e);
	}
};

export default defineStore('settings', {
	state: () => ({ aiModel: loadAiModel() }),
	actions: {
		updateAiModel(model) {
			const nextModel = isSupportedAiModel(model) ? model : DEFAULT_AI_MODEL;

			this.aiModel = nextModel;
			saveAiModel(nextModel);
		}
	}
});
