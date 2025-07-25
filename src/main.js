/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'

// Styles
import 'unfonts.css'
import 'shepherd.js/dist/css/shepherd.css'
import "vue-toastification/dist/index.css";

const app = createApp(App)

registerPlugins(app)

app.mount('#app')
