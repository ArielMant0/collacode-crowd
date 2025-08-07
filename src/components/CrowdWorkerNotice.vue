<template>
    <v-card v-if="app.isCrowdWorker" rounded="lg" class="mt-2 mb-4" density="compact" :max-width="maxWidth" color="surface-light">
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
                <a :href="app.cwLink">{{ app.cwLink }}</a>
                <div class="mt-2">
                    If you want to continue with other {{ app.itemName }}s and have turned in the study on Prolific,
                    you can click this button to confirm that. This will hide the return link to Prolific.
                    <b>This action cannot be reversed.</b>
                    <v-btn class="mt-1" block variant="flat" color="error" @click="confirm">i confirm that i submitted my participation on Prolific</v-btn>
                </div>
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
    import { useTimes } from '@/stores/times';
    import { setCrowdWorkerSubmitted } from '@/use/data-api';
    import { useToast } from 'vue-toastification';

    const app = useApp()
    const times = useTimes()
    const toast = useToast()

    const props = defineProps({
        maxWidth: {
            type: [String, Number],
            default: "auto"
        }
    })

    async function confirm() {
        if (app.isCrowdWorker && app.isCrowdWorkerDone) {
            try {
                await setCrowdWorkerSubmitted()
                times.needsReload("crowd_meta")
                times.needsReload("crowd")
            } catch(e) {
                console.error(e.toString())
                toast.error("error occurred")
            }
        }
    }
</script>