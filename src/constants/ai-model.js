// レシート解析に使えるAIモデル。
// 追加・変更する場合は firebase-cloud-functions/index.js の RECEIPT_MODELS も合わせること
// （サーバ側でも同じ一覧で検証しており、ここにしかないモデルを指定すると invalid-argument になる）
// key はモデルIDにドットや記号が含まれてi18nのキーに使えないため、翻訳キー用に別で持つ
const AI_MODELS = [
	{ id: 'gemini-3.6-flash', key: 'flash' },
	{ id: 'gemini-3.5-flash-lite', key: 'flash_lite' }
];

const DEFAULT_AI_MODEL = AI_MODELS[0].id;

const isSupportedAiModel = (id) => AI_MODELS.some((model) => model.id === id);

export { AI_MODELS, DEFAULT_AI_MODEL, isSupportedAiModel };
