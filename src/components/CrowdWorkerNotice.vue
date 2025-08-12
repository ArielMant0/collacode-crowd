<template>
    <div class="d-flex justify-center" style="max-width: 100%;">
        <v-card v-if="app.isCrowdWorker" :max-width="maxWidth" rounded="lg" class="mt-2 mb-4" density="compact" color="surface-light">
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
                <div v-if="app.isCrowdWorkerBlocked">
                    You failed too many attention checks, please use this link to go back to Prolific.
                    <a :href="app.cwLinks.linkFail" target="_blank">{{ app.cwLinks.linkFail }}</a>
                    You can also use this code to submit your participation: <b>{{ app.cwLinks.codeFail }}</b>
                </div>
                <div v-else-if="app.isCrowdWorkerSoftlocked">
                    You failed too many knowledge checks and there are not enough {{ app.itemName }}s left, please use this link to go back to Prolific.
                    <a :href="app.cwLinks.linkSoftlock" target="_blank">{{ app.cwLinks.linkSoftlock }}</a>
                    You can also use this code to submit your participation: <b>{{ app.cwLinks.codeSoftlock }}</b>
                </div>
                <div v-else-if="app.isCrowdWorkerDone">
                    You reached the end of the study. Use this link to complete the study and go back to Prolific:
                    <a :href="app.cwLinks.linkSuccess" target="_blank">{{ app.cwLinks.linkSuccess }}</a>
                    You can also use this code to submit your participation: <b>{{ app.cwLinks.codeSuccess }}</b>
                    <div class="mt-4">
                        If you like this application, you can come back - <span>after you turned in your study on Prolific</span> -
                        and do <b>more {{ app.itemName }}s</b> or try out the <b>other condition</b>.
                        If you have turned in the study on Prolific, you can click the button below to confirm that and then
                        all the remaining {{ app.itemName }}s and conditions will be unlocked for you.
                        <b>Clicking the button will hide the return link to Prolific. This action cannot be reversed.</b>
                        <v-btn class="mt-1" block variant="flat" color="error" @click="confirm">
                            i confirm that i submitted the study on Prolific
                        </v-btn>
                    </div>
                </div>
                <div v-else-if="app.isCrowdWorkerReady">
                    Please answer the four feedback questions on the <router-link to="/feedback">feedback page</router-link> to complete the study.
                </div>
                <div v-else>
                    Complete {{ CW_MAX_SUB }} {{ app.itemName }}s and the feedback questionnaire to complete this study.
                    Please do not refresh the page during the study unless you encounter errors.
                    Click on a game you know well to start the process.
                    <div class="mt-4" style="text-align: center;">
                        You have completed <b>{{ app.numSubmissions }} out of {{ CW_MAX_SUB }}</b> {{ app.itemName }}s
                    </div>
                </div>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup>
    import router from '@/router';
    import { CW_MAX_SUB, useApp } from '@/stores/app';
    import { useTimes } from '@/stores/times';
    import { setCrowdWorkerSubmitted } from '@/use/data-api';
    import { useRoute } from 'vue-router';
    import { useToast } from 'vue-toastification';

    const app = useApp()
    const times = useTimes()
    const toast = useToast()
    const route = useRoute()

    const props = defineProps({
        maxWidth: {
            type: [String, Number],
            default: "1000px"
        }
    })

    async function confirm() {
        if (app.isCrowdWorker && app.isCrowdWorkerDone) {
            const inFeedback = route.name.startsWith("/feedback")
            try {
                await setCrowdWorkerSubmitted()
                if (inFeedback) {
                    setTimeout(() => router.push("/"), 3000)
                }
                times.needsReload("crowd_meta")
                times.needsReload("crowd")
            } catch(e) {
                console.error(e.toString())
                toast.error("error occurred")
            }
        }
    }
</script>