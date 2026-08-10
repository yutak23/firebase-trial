// 撮影画像をそのまま送るとモバイルでは数MBになるため、送信前に縮小する
const fileToResizedBase64 = async (file, options = {}) => {
	const { maxEdge = 1600, quality = 0.8 } = options;

	let bitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch (e) {
		// HEICなどブラウザがデコードできない形式
		throw new Error('unsupported image format');
	}

	const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);

	canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();

	const dataUrl = canvas.toDataURL('image/jpeg', quality);

	return {
		imageBase64: dataUrl.slice(dataUrl.indexOf(',') + 1),
		mimeType: 'image/jpeg'
	};
};

// eslint-disable-next-line import/prefer-default-export
export { fileToResizedBase64 };
