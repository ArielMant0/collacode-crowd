<template>
    <div class="d-flex justify-center">
        <div v-if="app.numSubmissions >= 3" style="min-width: 300px; width: 75%; max-width: 900px">

            <div style="margin-top: 1em; margin-bottom: 1em; font-size: 30px; text-align: center;">
                What do you think about this application?
            </div>

            <div>
                <div v-for="(q, idx) in questions" class="mb-8">
                    <div class="mb-1"><b>{{ idx+1 }}.</b> {{ q.text }}</div>

                    <div class="d-flex align-center flex-column">

                        <div class="d-flex align-start justify-space-between" style="width: 100%;">
                            <div v-for="(o, j) in answerOptions" class="d-flex flex-column align-center" :style="{ width: optWidth+'px', maxWidth: optWidth+'px' }">
                                <svg v-if="data.stats[q.id] && data.ratings[q.id] !== null" :width="optWidth" height="30">
                                    <rect
                                        :x="10"
                                        :y="30 - (data.stats[q.id][o.value]/data.maxCount)*30"
                                        :width="optWidth-20"
                                        :height="(data.stats[q.id][o.value]/data.maxCount)*30"
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
                                        {{ data.stats[q.id][o.value] }}
                                    </text>
                                </svg>
                                <v-btn
                                    :icon="data.ratings[q.id] === o.value ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                                    :color="data.ratings[q.id] === o.value ? 'primary' : 'default'"
                                    density="compact"
                                    variant="text"
                                    @click="setRating(q.id, o.value)"/>
                                <div style="text-align: center">
                                    <div class="text-dots">{{ o.name }}</div>
                                    <v-icon v-if="o.icon">{{ o.icon }}</v-icon>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-top: 2em; font-size: 30px; text-align: center;">
                Here you can send us open feedback about your experience with this application
                or about the project in general.
            </div>
            <v-textarea v-model="text"
                density="compact"
                variant="outlined"
                style="margin-top: 4em;"
                label="Feedback (max. 1000 characters)"
                hide-spin-buttons
                :rows="10"
                :rules="[v => v.length <= 1000 || 'feedback can only be up to 1000 characters']"
                placeholder="Write down your feedback here.."/>

            <div style="text-align: center;">
                <v-btn
                    class="mt-2"
                    density="comfortable"
                    @click="submit"
                    :disabled="!text || text.length === 0"
                    :color="text && text.length > 0 ? 'primary' : 'default'">
                    submit
                </v-btn>
            </div>
        </div>
        <div v-else style="margin-top: 2em; font-size: 30px; text-align: center;">
            You must complete at least 3 {{ app.itemName }}s before you can give feedback.
        </div>
    </div>
</template>

<script setup>
    import { useApp } from '@/stores/app';
    import { SOUND, useSounds } from '@/stores/sounds';
    import { addFeedback, addRatings, getClientRatings, getRatingStats } from '@/use/data-api';
    import { storeToRefs } from 'pinia';
    import { onMounted, reactive, watch } from 'vue';
    import { POSITION, useToast } from 'vue-toastification';
    import { useTheme } from 'vuetify';

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
        maxCount: 1
    })

    const questions = [
        { id: "ease", text: "I found it easy to use this application." },
        { id: "fun", text: "I had fun using this application." },
        { id: "satisfaction", text: "I am satisfied with the results I got using this application." },
        { id: "preference", text: "I prefer using this application over searching through a list to find similar items." },
    ]
    const answerOptions = [
        { name: "strongly agree", value: 5, icon: "mdi-emoticon-happy-outline" },
        { name: "agree", value: 4 },
        { name: "neutral", value: 3, icon: "mdi-emoticon-neutral-outline" },
        { name: "disagree", value: 2 },
        { name: "strongly disagree", value: 1, icon: "mdi-emoticon-sad-outline" }
    ]

    async function read() {

        const obj = {}
        questions.forEach(q => obj[q.id] = null)

        try {
            // get ratings for this client
            const res = await getClientRatings()
            for (const id in res) {
                obj[id] = res[id]
            }
        } catch (e) {
            console.error(e.toString())
        }

        data.ratings = obj

        getGlobalRatings()
    }

    async function getGlobalRatings() {
        try {
            // get global ratings stats
            const res = await getRatingStats()
            data.maxCount = 1
            for (const id in res) {
                if (data.ratings[id] === null) continue
                for (const rating in res[id]) {
                    data.maxCount = Math.max(data.maxCount, res[id][rating])
                }
            }
            data.stats = res
        } catch (e) {
            console.error(e.toString())
        }
    }

    async function submit() {
        if (text.value && text.value.length > 0) {
            try {
                // submit text feedback
                await addFeedback(text.value)
                sounds.play(SOUND.WIN_MINI)
                toast.success(
                    "thanks for your feedback :)",
                    {
                        position: POSITION.TOP_CENTER,
                        timeout: 2000
                    }
                )
                text.value = ""
            } catch(e) {
                console.error(e.toString())
                toast.error("invalid feedback")
            }
        }
    }

    function setRating(id, value) {
        data.ratings[id] = value
        submitRatings()
    }

    async function submitRatings() {
        const values = Object.values(data.ratings)
        if (values.some(v => v !== null)) {
            try {
                // submit ratings
                await addRatings(data.ratings)
                sounds.play(SOUND.CLICK)
                getGlobalRatings()
            } catch(e) {
                console.error(e.toString())
                toast.error("invalid rating")
            }
        }
    }

    onMounted(read)

    watch(activeUserId, read)
</script>