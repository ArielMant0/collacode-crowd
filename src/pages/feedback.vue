<template>
    <div class="pb-8">
    <CrowdWorkerNotice/>

    <div class="d-flex justify-center">
        <div v-if="app.numSubmissions >= CW_MAX_SUB" style="min-width: 300px; width: 75%; max-width: 900px">
            <div style="margin-top: 2em;">

                <div v-if="!app.isCrowdWorker && app.numFeedback < questions.length" class="text-caption">
                    be aware, feedback can only be submitted <b style="text-decoration: underline;">once</b>
                </div>

                <div v-for="(q, idx) in questions" class="mb-8">
                    <div class="mb-1"><b>{{ idx+1 }}.</b><span class="text-red">*</span> {{ q.text }}</div>

                    <div class="d-flex align-center flex-column">

                        <div class="d-flex align-start justify-space-between" style="width: 100%;">

                            <div v-for="o in answerOptions"
                                class="d-flex flex-column align-center pa-2"
                                :style="{
                                    width: optWidth+'px',
                                    maxWidth: optWidth+'px',
                                    border: '1px solid ' + (done && data.ratings[q.id] === o.value ? theme.current.value.colors.primary : 'white')
                                }">
                                <svg v-if="data.stats[q.id] && done && data.sumCount >=3" :width="optWidth" height="30">
                                    <rect
                                        :x="10"
                                        :y="30 - (data.stats[q.id][o.value]/data.sumCount)*30"
                                        :width="optWidth-20"
                                        :height="(data.stats[q.id][o.value]/data.sumCount)*30"
                                        :fill="theme.current.value.colors.primary">
                                    </rect>
                                    <text v-if="data.stats[q.id][o.value]"
                                        :x="0.5*optWidth"
                                        :y="25"
                                        font-size="10"
                                        font-weight="bold"
                                        text-anchor="middle"
                                        stroke="white"
                                        stroke-width="2"
                                        paint-order="stroke"
                                        fill="black">
                                        {{ Math.round(data.stats[q.id][o.value] / data.sumCount * 100) }}%
                                    </text>
                                </svg>
                                <v-btn
                                    :icon="data.ratings[q.id] === o.value ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                                    :color="data.ratings[q.id] === o.value ? 'primary' : 'default'"
                                    :disabled="done"
                                    density="compact"
                                    variant="text"
                                    @click="setRating(q.id, o.value)"/>
                                <div style="text-align: center" :style="{ opacity: done && data.ratings[q.id]!==o.value ? 0.33 : 1 }">
                                    <div class="text-dots">{{ o.name }}</div>
                                    <v-icon v-if="o.icon">{{ o.icon }}</v-icon>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <v-textarea v-if="!done"
                v-model="text"
                density="compact"
                variant="outlined"
                style="margin-top: 2em;"
                label="Open feedback (max. 1000 characters)"
                hide-spin-buttons
                :rows="10"
                :rules="[v => v.length <= 1000 || 'feedback can only be up to 1000 characters']"
                placeholder="Write down your feedback here.."/>

            <div v-if="!done" style="text-align: center;">
                <v-btn
                    size="large"
                    density="comfortable"
                    @click="submit"
                    color="primary"
                    :disabled="numAnswered < questions.length"
                    :color="text && text.length > 0 ? 'primary' : 'default'">
                    submit
                </v-btn>
            </div>
        </div>
        <div v-else style="margin-top: 2em; font-size: 30px; text-align: center;">
            You must complete at least {{ CW_MAX_SUB }} {{ app.itemName }}s before you can give feedback.
        </div>
    </div>

    <MiniDialog v-model="cwDialog" min-width="300" @close="onDialogClose" @cancel="onDialogClose" no-actions close-icon>
        <template #text>
            <div style="font-size: large; text-align: center;">
                Thanks for participating in this study! Click on this link to get back to Prolific:
                <div class="mt-2">
                    <a :href="app.cwLinks.linkSuccess" target="_blank">{{ app.cwLinks.linkSuccess }}</a>
                </div>
            </div>
        </template>
    </MiniDialog>
    </div>
</template>

<script setup>
    import { CW_MAX_SUB, useApp } from '@/stores/app';
    import CrowdWorkerNotice from '@/components/CrowdWorkerNotice.vue';
    import { SOUND, useSounds } from '@/stores/sounds';
    import { addFeedback, addInteractionLog, addRatings, getClientRatings, getRatingStats } from '@/use/data-api';
    import { storeToRefs } from 'pinia';
    import { computed, onMounted, reactive, watch } from 'vue';
    import { POSITION, useToast } from 'vue-toastification';
    import { useTheme } from 'vuetify';
    import MiniDialog from '@/components/MiniDialog.vue';

    const app = useApp()
    const toast = useToast()
    const sounds = useSounds()
    const theme = useTheme()

    const { activeUserId } = storeToRefs(app)

    const text = ref("")

    const optWidth = 120
    const data = reactive({
        ratings: {},
        stats: {},
        sumCount: 1
    })

    const cwDialog = ref(false)
    const done = computed(() => app.numFeedback >= questions.value.length)
    const numAnswered = computed(() => Object.values(data.ratings).reduce((acc, d) => acc + (d !== null ? 1 : 0), 0))

    const questions = computed(() => ([
        { id: "ease", text: "I found it easy to use this application." },
        { id: "fun", text: "I had fun using this application." },
        { id: "satisfaction", text: "I am satisfied with the results I got using this application." },
        {
            id: "preference",
            text: "I prefer using this application over going through a list of 400 " +
                app.itemName + "s ony by one."
        },
    ]))
    const answerOptions = [
        { name: "strongly agree", value: 5, icon: "mdi-emoticon-happy-outline" },
        { name: "agree", value: 4 },
        { name: "neutral", value: 3, icon: "mdi-emoticon-neutral-outline" },
        { name: "disagree", value: 2 },
        { name: "strongly disagree", value: 1, icon: "mdi-emoticon-sad-outline" }
    ]

    async function read() {

        const obj = {}
        questions.value.forEach(q => obj[q.id] = null)

        try {
            let num = 0
            // get ratings for this client
            const res = await getClientRatings()
            for (const id in res) {
                obj[id] = res[id]
                if (res[id] !== null) {
                    num++
                }
            }
            app.numFeedback = num
        } catch (e) {
            console.error(e.toString())
        }

        data.ratings = obj

        getGlobalRatings()
    }

    async function getGlobalRatings() {
        if (!done.value) return

        try {
            // get global ratings stats
            const res = await getRatingStats()
            let maxSum = 0
            for (const id in res) {
                let sumPerQ = 0
                for (const rating in res[id]) {
                    sumPerQ += res[id][rating]
                }
                maxSum = Math.max(maxSum, sumPerQ)
            }
            data.sumCount = maxSum
            data.stats = res
        } catch (e) {
            console.error(e.toString())
        }
    }


    function setRating(id, value) {
        data.ratings[id] = value
        sounds.play(SOUND.CLICK)
    }

    async function submitRatings() {
        const values = Object.values(data.ratings)
        if (values.some(v => v !== null)) {
            try {
                // submit ratings
                await addRatings(data.ratings)
            } catch(e) {
                console.error(e.toString())
                toast.error("invalid rating")
            }
        }
    }

    async function submitText() {
        if (text.value && text.value.length > 0) {
            try {
                // submit text feedback
                await addFeedback(text.value)
                text.value = ""
            } catch(e) {
                console.error(e.toString())
                toast.error("invalid feedback")
            }
        }
    }

    async function submit() {
        if (numAnswered.value < questions.value.length) {
            return toast.error("please answer all questions before submitting")
        }
        await submitRatings()
        await submitText()
        sounds.play(SOUND.WIN_MINI)
        toast.success(
            "thanks for your feedback :)",
            {
                position: POSITION.TOP_CENTER,
                timeout: 2000
            }
        )
        read()

        if (app.isCrowdWorker) {
            setTimeout(() => cwDialog.value = true, 100)
        }
    }

    function onDialogClose() {
        setTimeout(() => window.scrollTo(0, 0, { behavior: "smooth" }), 350)
    }


    onMounted(function() {
        addInteractionLog("feedback page")
        read()
    })

    watch(activeUserId, read)
</script>