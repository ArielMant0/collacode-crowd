// Plugins
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Fonts from 'unplugin-fonts/vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// Utilities
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'

import * as config from './collacode.config'

export const BASE_PATH = config.APP_BASE_PATH

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd())

  return {
    base: BASE_PATH,
    plugins: [
      VueRouter({ src: 'src/pages', path: BASE_PATH }),
      Layouts(),
      Vue({
        template: { transformAssetUrls },
      }),
      // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
      Vuetify({
        autoImport: true,
        styles: {
          configFile: 'src/styles/settings.scss',
        },
      }),
      Components(),
      Fonts({
        google: {
          families: [{
            name: 'Roboto',
            styles: 'wght@100;300;400;500;700;900',
          }],
        },
      }),
      AutoImport({
        imports: [
          'vue',
          VueRouterAutoImports,
          {
            pinia: ['defineStore', 'storeToRefs'],
          },
        ],
        eslintrc: {
          enabled: true,
        },
        vueTemplate: true,
      }),
    ],
    optimizeDeps: {
      exclude: [
        'vuetify',
        'vue-router',
        'unplugin-vue-router/runtime',
        'unplugin-vue-router/data-loaders',
        'unplugin-vue-router/data-loaders/basic',
      ],
    },
    define: {
      "process.env": {},
      "__APP_BASE_PATH__": JSON.stringify(config.APP_BASE_PATH),
      "__URL_TEASER__": JSON.stringify(config.URL_TEASER),
      "__URL_STATIC_DATA__": JSON.stringify(config.URL_STATIC_DATA),
      "__URL_EVIDENCE__": JSON.stringify(config.URL_EVIDENCE),
      "__URL_SOUND__": JSON.stringify(config.URL_SOUND),
      "__URL_IMAGES__": JSON.stringify(config.URL_IMAGES),
      "__API_URL__": JSON.stringify(config.getApiUrl(env.VITE_BACKEND))
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('src', import.meta.url)),
      },
      extensions: [
        '.js',
        '.json',
        '.jsx',
        '.mjs',
        '.ts',
        '.tsx',
        '.vue',
      ],
    },
    server: {
      port: config.getPort(env.VITE_FRONTEND),
      base: BASE_PATH
    },
    preview: {
      port: config.getPort(env.VITE_FRONTEND),
      host: true,
      base: BASE_PATH,
      allowedHosts: config.ALLOWED_HOSTS
    },
    css: {
      preprocessorOptions: {
        sass: {
          api: 'modern-compiler',
        },
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  }
})
