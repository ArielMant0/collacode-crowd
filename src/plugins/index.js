/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.js`
 */

// Plugins
import vuetify from './vuetify'
import pinia from '@/stores'
import router from '@/router'
import Toast from "vue-toastification";

export function registerPlugins (app) {
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
    .use(Toast, {
      timeout: 2000,
      toastClassName: 'ctoast',
      bodyClassName: ['ctoast'],
    })
}
