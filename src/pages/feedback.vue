<template>
    <div class="pb-8">
    <CrowdWorkerNotice/>

    <div class="d-flex justify-center">
        <div  style="min-width: 300px; width: 75%; max-width: 900px">

            <div style="margin-top: 2em;">

                <div v-if="!app.isCrowdWorker" style="width: 100%; text-align: center;">
                    <GameModeToggle v-model="gameId" :disabled="app.isCrowdWorker"/>
                </div>

                <div v-if="!app.isCrowdWorker && isValidGameId && app.numFeedback[gameId] < questions.length"
                    style="text-align: center;"
                    class="text-caption mt-1">
                    be aware, feedback can only be submitted <b style="text-decoration: underline;">once</b> per game mode
                </div>

                <div v-if="canGiveFeedback || done" class="mt-4">
                    <div v-for="(q, idx) in questions" class="mb-8">
                        <div class="mb-1"><b>{{ idx+1 }}.</b><span class="text-red">*</span> <span v-html="q.text"></span></div>

                        <div class="d-flex align-center flex-column">

                            <div class="d-flex align-start justify-space-between" style="width: 100%;">

                                <div v-for="o in answerOptions"
                                    class="d-flex flex-column align-center pa-2"
                                    :style="{
                                        width: optWidth+'px',
                                        maxWidth: optWidth+'px',
                                        border: '1px solid ' + (done && activeRating && activeRating[q.id] === o.value ? theme.current.value.colors.primary : 'white')
                                    }">
                                    <svg v-if="activeStats && activeStats[q.id] && done && activeSum >=3" :width="optWidth" height="30">
                                        <rect
                                            :x="10"
                                            :y="30 - (activeStats[q.id][o.value]/activeSum)*30"
                                            :width="optWidth-20"
                                            :height="(activeStats[q.id][o.value]/activeSum)*30"
                                            :fill="theme.current.value.colors.primary">
                                        </rect>
                                        <text v-if="activeStats[q.id][o.value]"
                                            :x="0.5*optWidth"
                                            :y="25"
                                            font-size="10"
                                            font-weight="bold"
                                            text-anchor="middle"
                                            stroke="white"
                                            stroke-width="2"
                                            paint-order="stroke"
                                            fill="black">
                                            {{ Math.round(activeStats[q.id][o.value] / activeSum * 100) }}%
                                        </text>
                                    </svg>
                                    <v-btn
                                        :icon="activeRating && activeRating[q.id] === o.value ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                                        :color="activeRating && activeRating[q.id] === o.value ? 'primary' : 'default'"
                                        :disabled="done"
                                        density="compact"
                                        variant="text"
                                        @click="setRating(q.id, o.value)"/>
                                    <div style="text-align: center" :style="{ opacity: done && activeRating && activeRating[q.id]!==o.value ? 0.33 : 1 }">
                                        <div class="text-dots" v-html="o.name "></div>
                                        <v-icon v-if="o.icon">{{ o.icon }}</v-icon>
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
                    You must complete at least {{ CW_MAX_SUB }} {{ app.itemName }}s  for this mode before
                    you can give feedback.
                </div>
            </div>
        </div>

    </div>

    <MiniDialog v-model="cwDialog" min-width="300" @close="onDialogClose" @cancel="onDialogClose" no-actions close-icon>
        <template #text>
            <div style="font-size: large; text-align: center;">
                Thanks for participating in this study! Click on this link to get back to Prolific:
                <div class="mt-2 mb-2">
                    <a :href="app.cwLinks.linkSuccess" target="_blank">{{ app.cwLinks.linkSuccess }}</a>
                </div>
                If you want to continue with other games after the study, you can come back anytime using this link:
                <div class="mt-2 mb-2" style="text-align: center;">
                    <a href="https://arielmant0.github.io/collacode-crowd/" target="_blank">https://arielmant0.github.io/collacode-crowd/</a>
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
    import router from '@/router';
    import { GAME_IDS } from '@/stores/games';
    import GameModeToggle from '@/components/GameModeToggle.vue';

    const app = useApp()
    const toast = useToast()
    const sounds = useSounds()
    const theme = useTheme()

    const { activeUserId } = storeToRefs(app)

    const gameId = ref(app.method)
    const isValidGameId = computed(() => gameId.value === GAME_IDS.BINSEARCH || gameId.value === GAME_IDS.CLUSTERS)
    const text = ref("")

    const optWidth = 120
    const data = reactive({
        ratings: {},
        stats: {},
        sumCount: {}
    })

    const activeRating = computed(() => isValidGameId.value ? data.ratings[gameId.value] : null)
    const activeStats = computed(() => isValidGameId.value ? data.stats[gameId.value] : null)
    const activeSum = computed(() => isValidGameId.value ? data.sumCount[gameId.value] : null)

    const cwDialog = ref(false)

    const canGiveFeedback = computed(() => isValidGameId.value && app.methodCounts.get(gameId.value) >= CW_MAX_SUB)
    const done = computed(() => isValidGameId.value && app.numFeedback[gameId.value] >= questions.value.length)
    const numAnswered = computed(() => isValidGameId.value && activeRating.value ?
        Object.values(activeRating.value).reduce((acc, d) => acc + (d !== null ? 1 : 0), 0) :
        0
    )

    const questions = computed(() => ([
        { id: "ease", text: `I found it <span class="text-decoration-underline">easy</span> to use this application.` },
        { id: "fun", text: `I had <span class="text-decoration-underline">fun</span> using this application.` },
        { id: "satisfaction", text: `I am <span class="text-decoration-underline">satisfied with the results</span> I got using this application.` },
        {
            id: "preference",
            text: `I <span class="text-decoration-underline">prefer</span> using this application over going through a list of 400 ${app.itemName}s ony by one.`
        },
    ]))
    const answerOptions = [
        { name: "strongly <b>agree</b>", value: 5, icon: "mdi-emoticon-happy-outline" },
        { name: "<b>agree</b>", value: 4 },
        { name: "neutral", value: 3, icon: "mdi-emoticon-neutral-outline" },
        { name: "<b>disagree</b>", value: 2 },
        { name: "strongly <b>disagree</b>", value: 1, icon: "mdi-emoticon-sad-outline" }
    ]

    async function read() {

        const obj = {}
        const gids = [GAME_IDS.BINSEARCH, GAME_IDS.CLUSTERS]

        gids.forEach(gid => {
            obj[gid] = {}
            questions.value.forEach(q => obj[gid][q.id] = null)
        })

        try {
            const res = await getClientRatings()
            gids.forEach(gid => {
                let num = 0
                // get ratings for this client
                for (const id in res[gid]) {
                    obj[gid][id] = res[gid][id]
                    if (res[gid][id] !== null) {
                        num++
                    }
                }
                app.numFeedback[gid] = num
            })
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
            const gids = [GAME_IDS.BINSEARCH, GAME_IDS.CLUSTERS]
            data.sumCount = {}
            gids.forEach(gid => {
                let maxSum = 0
                for (const id in res[gid]) {
                    let sumPerQ = 0
                    for (const rating in res[gid][id]) {
                        sumPerQ += res[gid][id][rating]
                    }
                    maxSum = Math.max(maxSum, sumPerQ)
                }
                data.sumCount[gid] = maxSum
            })
            data.stats = res
        } catch (e) {
            console.error(e.toString())
        }
    }


    function setRating(id, value) {
        if (!isValidGameId.value) {
            return toast.error("please select a game mode")
        }
        data.ratings[gameId.value][id] = value
        sounds.play(SOUND.CLICK)
    }

    async function submitRatings() {
        if (numAnswered.value < questions.value.length) {
            return toast.error("please answer all questions")
        }
        if (!isValidGameId.value) {
            return toast.error("please select a game mode")
        }

        try {
            // submit ratings
            await addRatings(Object.assign({ game_id: gameId.value }, activeRating.value))
        } catch(e) {
            console.error(e.toString())
            toast.error("invalid rating")
        }
    }

    async function submitText() {
        if (!isValidGameId.value) {
            return toast.error("please select a game mode")
        }
        if (text.value && text.value.length > 0) {
            try {
                // submit text feedback
                await addFeedback(gameId.value, text.value)
                text.value = ""
            } catch(e) {
                console.error(e.toString())
                toast.error("invalid feedback")
            }
        }
    }

    async function submit() {
        if (numAnswered.value < questions.value.length) {
            return toast.error("please answer all questions")
        }
        if (!isValidGameId.value) {
            return toast.error("please select a game mode")
        }
        await Promise.all([submitRatings(), submitText()])
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
        window.scrollTo(0, 0, { behavior: "smooth" })
        setTimeout(() => router.push("/"), 1500)
    }


    onMounted(function() {
        if (app.isCrowdWorker) {
            gameId.value = app.method
        } else {
            //  C  |  B
            // ---------
            // 0 0 | 0 0 -> C
            // 0 Y | 0 0 -> C
            // 0 0 | 0 Y -> B
            // Y Y | 0 0 -> C
            // 0 0 | Y Y -> B
            // Y Y | 0 Y -> B
            // 0 Y | Y Y -> C
            // Y Y | Y Y -> C
            if (
                app.getMethodCount(GAME_IDS.BINSEARCH) >= CW_MAX_SUB &&
                (
                    app.getMethodCount(GAME_IDS.CLUSTERS) < CW_MAX_SUB ||
                    app.numFeedback[GAME_IDS.BINSEARCH] < questions.value.length
                )
            ) {
                gameId.value = GAME_IDS.BINSEARCH
            } else {
                gameId.value = GAME_IDS.CLUSTERS
            }
        }
        addInteractionLog("feedback page")
        read()
    })

    watch(activeUserId, read)
    watch(gameId, getGlobalRatings)
</script>