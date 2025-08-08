<template>
  <v-app>
    <v-app-bar flat density="compact" class="pa-0 top-bar" height="50" absolute>
        <v-app-bar-title density="compact">
            <span style="font-size: 18px;">
                <v-icon class="mr-2 mb-1">mdi-crowd</v-icon>
                <span class="bitcount-prop-double">CollaCode Crowd Similarity</span>
            </span>

            <v-divider vertical opacity="0.5" color="primary" style="min-height: 1em;" class="ml-3 mr-3"></v-divider>

            <v-btn v-for="(l, idx) in links"
                @click="router.push(l.route)"
                :class="{ 'ml-1': idx > 0 }"
                :prepend-icon="l.icon"
                rounded="0"
                :variant="route.name === l.route ? 'tonal' : 'text'"
                :color="route.name === l.route ? 'primary' : (l.color ? l.color : 'default')">
                {{ l.name }}
            </v-btn>
        </v-app-bar-title>

    </v-app-bar>

    <v-main>
        <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
    import router from '@/router';
    import { useApp } from '@/stores/app';
    import { useRoute } from 'vue-router';

    const app = useApp()
    const route = useRoute()

    const links = computed(() => {
        return [
            { name: "home", icon: "mdi-home", route: "/" },
            { name: "about", icon: "mdi-information",  route: "/about" },
            { name: "feedback", icon: "mdi-comment",  route: "/feedback" },
            {
                name: "graph",
                icon: "mdi-graph-outline",
                route: "/graph",
                color: app.numSubmissions < 5 ? 'error' : 'default'
            },
        ]
    })
</script>

<style scoped>
.top-bar {
    border-bottom: 1px solid lightgrey;
    max-height: 50px;
}
</style>