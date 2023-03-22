import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import eslint from 'vite-plugin-eslint';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		nodePolyfills({ protocolImports: true }),
		vue({ template: { transformAssetUrls } }),
		vuetify({
			autoImport: true,
			styles: { configFile: 'src/styles/settings.scss' }
		}),
		eslint()
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url))
		}
	},
	server: { host: '0.0.0.0', port: 8080 }
});
