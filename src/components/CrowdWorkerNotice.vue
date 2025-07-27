<template>
    <v-card v-if="app.cwId" rounded="lg" class="mt-2 mb-4" density="compact" :max-width="maxWidth" color="surface-light">
        <v-card-title :class="[app.isCrowdWorkerDone ? 'text-error' : 'text-warning']">
            <div v-if="app.isCrowdWorkerDone" class="d-flex align-center">
                <v-icon color="error" icon="mdi-alert" class="mr-2"/>
                Attention
            </div>
            <div v-else class="d-flex align-center">
                <v-icon color="warning" icon="mdi-alert-circle" class="mr-2"/>
                Notice
            </div>
        </v-card-title>
        <v-card-text>
            <div v-if="app.isCrowdWorkerDone">
                Maximum number of {{ app.itemName }}s reached. Use this link to complete the study and go back to Prolific:
                <a :href="app.cwLink">{{ app.cwLink }}
                </a>
            </div>
            <div v-else>
                Crowd workers can only do up to {{ CW_MAX_SUB }} {{ app.itemName }}s.
                After {{ CW_MAX_SUB }} {{ app.itemName }}s, other {{ app.itemName }}s can longer longer be completed
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
    import { CW_MAX_SUB, useApp } from '@/stores/app';

    const app = useApp()

    const props = defineProps({
        maxWidth: {
            type: [String, Number],
            default: "auto"
        }
    })
</script>