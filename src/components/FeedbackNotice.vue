<template>
    <div v-if="show" class="d-flex justify-center" style="max-width: 100%;">
        <v-card :max-width="maxWidth" rounded="lg" class="mt-2 mb-4" density="compact" color="surface-light">

            <v-card-title class="text-info">
                <v-icon color="info" icon="mdi-information" class="mr-2"/> Feedback
            </v-card-title>

            <v-card-text>
                Please consider rating your experience on the <router-link to="/feedback">feedback page</router-link>!
                It's pretty quick to do and would be much appreciated :)
            </v-card-text>

        </v-card>
    </div>
</template>

<script setup>
    import { CW_MAX_SUB, useApp } from '@/stores/app';

    const app = useApp()
    const show = computed(() => {
        return !app.isCrowdWorker &&
            app.numFeedback < 4 &&
            app.numSubmissions >= CW_MAX_SUB
    })

    const props = defineProps({
        maxWidth: {
            type: [String, Number],
            default: "1000px"
        }
    })
</script>