<template>
    <div style="max-height: 95vh; overflow-y: auto;">

        <div v-if="state === STATES.START"class="d-flex align-center justify-center">
            <LoadingScreen/>
        </div>

        <div v-if="state === STATES.INGAME && notInCheck" class="d-flex justify-center">
            <v-stepper flat :model-value="stepIndex" style="min-width: 85%; max-width: 95%;" class="mb-4">
                <v-stepper-header>
                    <template v-for="(s, idx) in gameData.steps">
                        <v-stepper-item
                            :title="s.title"
                            :value="idx+1"
                            color="primary"
                            :complete="s.step < step"/>

                        <v-divider v-if="idx < gameData.steps.length-1"></v-divider>
                    </template>
                </v-stepper-header>
            </v-stepper>
        </div>

        <div v-if="state === STATES.INGAME || state === STATES.END" class="d-flex flex-column align-center" style="width: 100%; max-width: 100%;">

            <div class="d-flex align-center mb-4">
                <div v-if="notInCheck" class="d-flex flex-column align-center">
                    <div>{{ gameData.target.name }}</div>
                    <ItemTeaser
                        :item="gameData.target"
                        :width="180"
                        :height="90"
                        :prevent-click="state !== STATES.END"
                        :prevent-open="state !== STATES.END"
                        :prevent-context="state !== STATES.END"/>
                </div>

                <Timer v-if="showTimer" ref="timer" class="ml-8 mt-4" :time-in-sec="timeInSec" @end="nextStep(true)"/>
            </div>

            <div v-if="step === PR_STEPS.COMPREHENSION" class="mt-8">
                <ComprehensionCheck
                    :title="target.name"
                    :questions="gameData.comprehension"
                    @submit="testComp"/>
            </div>
            <div v-else-if="step === PR_STEPS.GAME">
                <ItemGraphPath v-if="method === 1"
                    ref="clusters"
                    @submit="setCandidates"
                    :max-items="30"
                    :target="gameData.target.id"/>
                <ItemBinarySearch v-else
                    ref="binsearch"
                    :min-items="15"
                    :max-items="30"
                    @submit="setCandidates"
                    :target="gameData.target.id"/>
            </div>
            <div v-else-if="step === PR_STEPS.SELECT" class="mt-4 mb-8" style="width: 95%; max-width: 100%;">
                <div style="text-align: center;">
                    <v-btn class="mb-2" color="primary" @click="nextStep(false)">next step</v-btn>
                </div>
                <ItemTagRecommend
                    :item-limit="10"
                    :items="candidates"
                    @update="setResultItems"/>
            </div>
            <div v-else-if="step === PR_STEPS.REFINE" class="mt-4 mb-8" style="width: 95%; max-width: 100%;">
                <div style="text-align: center;">
                    <v-btn class="mb-2" color="primary" @click="nextStep(false)">submit</v-btn>
                </div>
                <ItemCustomRecommend
                    :item-limit="10"
                    :target="gameData.target.id"
                    :items="gameData.resultItems"
                    @update="setAdditionalItems"/>
            </div>

            <div v-else-if="step === PR_STEPS.ATTENTION && state === STATES.INGAME">
                <AttentionCheck @submit="testAttention"/>
            </div>

            <div v-else-if="state === STATES.END" class="mb-8 d-flex flex-column align-center" :style="{ maxWidth: (190*5)+'px' }">
                <div style="max-width: 100%; text-align: center;">
                    <h3>Your Choices</h3>
                    <div class="d-flex flex-wrap justify-center">
                        <ItemTeaser v-for="item in gameData.resultItems"
                            :id="item.id"
                            prevent-click
                            prevent-context
                            class="mr-1 mb-1"/>
                        <ItemTeaser v-for="item in gameData.customItems"
                            :id="item.id"
                            prevent-click
                            prevent-context
                            class="mr-1 mb-1"/>
                    </div>
                </div>
                <div v-if="gameData.otherItems.length" class="mt-4" style="max-width: 100%; text-align: center;">
                    <h3>Most Common Choices</h3>
                    <div class="d-flex flex-wrap justify-center">
                        <ItemTeaser v-for="item in gameData.otherItems"
                            :id="item.id"
                            :border-size="4"
                            :border-color="item.same ? GR_COLOR.GREEN : 'default'"
                            prevent-click
                            prevent-contex
                            class="mr-1 mb-1"/>
                    </div>
                </div>
            </div>

            <div v-if="state === STATES.END" class="d-flex align-center justify-center">
                <v-btn class="mr-1" size="large" color="error" @click="close">back to home</v-btn>
            </div>

        </div>
    </div>
</template>

<script setup>
    import { computed, onMounted, reactive, useTemplateRef, watch } from 'vue'
    import { GR_COLOR, STATES } from '@/stores/games'
    import { useSounds, SOUND } from '@/stores/sounds';
    import { storeToRefs } from 'pinia'
    import LoadingScreen from './LoadingScreen.vue'
    import ItemTeaser from './items/ItemTeaser.vue'
    import ItemGraphPath from './items/ItemGraphPath.vue'
    import { PR_STEPS, useApp } from '@/stores/app'
    import ItemBinarySearch from './items/ItemBinarySearch.vue'
    import ItemTagRecommend from './items/ItemTagRecommend.vue'
    import ItemCustomRecommend from './items/ItemCustomRecommend.vue'
    import { addAttentionFail, addSimilarity, getClientStatus, getSimilarByTarget, loadComprehensionData, testComprehensionData } from '@/use/data-api'
    import { POSITION, useToast } from 'vue-toastification'
    import router from '@/router'
    import Timer from './Timer.vue';
    import ComprehensionCheck from './ComprehensionCheck.vue';
    import AttentionCheck from './AttentionCheck.vue';

    const emit = defineEmits(["end", "close", "cancel"])

    // stores
    const app = useApp()
    const sounds = useSounds()
    const toast = useToast()

    const { target } = storeToRefs(app)

    const timer = useTemplateRef("timer")
    const clusters = useTemplateRef("clusters")
    const binsearch = useTemplateRef("binsearch")

    const step = ref(PR_STEPS.COMPREHENSION)
    const stepIndex = ref(1)
    const candidates = ref([])

    let ilog = null
    let attentionDone = false, attentionNext = null
    let timeStart, timeEnd

    const props = defineProps({
        method: {
            type: Number,
            required: true,
            validator: v => v === 1 || v === 2
        },
        attentionChecks: {
            type: Boolean,
            default: true
        },
        useTimer: {
            type: Boolean,
            default: true
        },
    })

    const showTimer = computed(() => props.useTimer && state.value === STATES.INGAME)
    const timeInSec = computed(() => {
        switch (step.value) {
            // attention check
            case PR_STEPS.ATTENTION:
                return 15

            // game phase
            case PR_STEPS.GAME:
                return 180

            // comprehension check
            case PR_STEPS.COMPREHENSION:
            // selection phases
            default:
                return 60
        }
    })

    // game related stuff
    const state = ref(STATES.START)
    const gameData = reactive({
        target: null,
        steps: [],
        resultItems: [],
        customItems: [],
        otherItems: [],
        comprehension: []
    })

    const notInCheck = computed(() => step.value !== PR_STEPS.ATTENTION && step.value !== PR_STEPS.COMPREHENSION)

    // ---------------------------------------------------------------------
    // Functions
    // ---------------------------------------------------------------------

    function startTimer() {
        if (props.useTimer) {
            if (timer.value) {
                timer.value.start()
            } else {
                setTimeout(startTimer, 100)
            }
        }
    }
    function stopTimer() {
        if (timer.value) {
            timer.value.stop()
        }
    }
    function resetTimer() {
        stopTimer()
        setTimeout(startTimer, 150)
    }

    function setFirstStep() {
        if (gameData.comprehension.length > 0) {
            step.value = PR_STEPS.COMPREHENSION
        } else {
            step.value = PR_STEPS.GAME
        }
        stepIndex.value = 1
    }

    function nextStep(onTimerEnd=false) {
        switch(step.value) {
            case PR_STEPS.COMPREHENSION:
                if (onTimerEnd) {
                    // the user did not answer the questions in time
                    testComp()
                } else {
                    step.value = PR_STEPS.GAME
                    resetTimer()
                }
                break
            case PR_STEPS.GAME: {
                if (onTimerEnd) {
                    let data
                    // get the data from clusters/binary search
                    if (clusters.value) {
                        data = clusters.value.getSubmitData()
                    } else if (binsearch.value) {
                        data = binsearch.value.getSubmitData()
                    }

                    if (data) {
                        setCandidates(data.candidates, data.log)
                    }
                }

                // see if we do the attention check now
                if (!attentionDone && props.attentionChecks) { // && Math.random() > 0.75) {
                    step.value = PR_STEPS.ATTENTION
                    attentionDone = true
                    attentionNext = PR_STEPS.SELECT
                } else {
                    stepIndex.value++
                    step.value = PR_STEPS.SELECT
                }
                resetTimer()
                break
            }
            case PR_STEPS.SELECT:
                if (!attentionDone && props.attentionChecks && Math.random() > 0.5) {
                    step.value = PR_STEPS.ATTENTION
                    attentionDone = true
                    attentionNext = PR_STEPS.REFINE
                } else {
                    stepIndex.value++
                    step.value = PR_STEPS.REFINE
                }
                resetTimer()
                break
            case PR_STEPS.REFINE:
                if (!attentionDone && props.attentionChecks) {
                    step.value = PR_STEPS.ATTENTION
                    attentionDone = true
                    attentionNext = null
                    resetTimer()
                } else {
                    stopGame()
                }
                break
            case PR_STEPS.ATTENTION:
                if (onTimerEnd) {
                    // user did not complete attention check in time
                    testAttention(false)
                } else {
                    if (attentionNext !== null) {
                        step.value = attentionNext
                        attentionNext = null
                        resetTimer()
                    } else {
                        stopGame()
                    }
                }
                break
        }
    }

    async function testComp(answers) {
        try {
            if (!answers) {
                answers = gameData.comprehension.map(() => -1)
            }
            const result = await testComprehensionData(target.value.id, answers, props.method)
            if (result.passed === true) {
                nextStep()
            } else {
                toast.error(
                    "you failed the comprehension check",
                    { timeout: 1500, position: POSITION.TOP_CENTER }
                )
                setTimeout(() => router.push("/"), 2000)
            }
        } catch(e) {
            console.error(e.toString())
            toast.error("error testing comprehension")
            goHome(1000)
        }
    }

    async function testAttention(passed) {
        if (passed) {
            nextStep()
        } else {
            try {
                await addAttentionFail(target.value.id, props.method)
                toast.error(
                    "you failed the attention check",
                    { timeout: 1500, position: POSITION.TOP_CENTER }
                )
                setTimeout(() => router.push("/"), 2000)
            } catch(e) {
                console.error(e.toString())
                toast.error("error adding attention fail")
                goHome(1000)
            }
        }
    }

    function setCandidates(items, logs) {
        candidates.value = items
        ilog = logs
        nextStep()
    }

    function setResultItems(items) {
        gameData.resultItems = items
    }
    function setAdditionalItems(items) {
        gameData.customItems = items
    }

    function startRound(timestamp=null) {
        state.value = STATES.START
        setFirstStep()
        sounds.play(SOUND.START_SHORT)
        setTimeout(
            () => {
                state.value = STATES.INGAME
                timeStart = Date.now()
                startTimer()
            },
            1000 - (timestamp !== null ? Date.now()-timestamp : 0)
        )
    }
    async function tryStartRound(timestamp=null) {
        ilog = null
        gameData.resultItems = []
        gameData.customItems = []
        gameData.otherItems = []
        stepIndex.value = 1

        if (!target.value) {
            state.value = STATES.START
            toast.error(
                "select an item in the main page first",
                { timeout: 1500, position: POSITION.TOP_CENTER }
            )
            return setTimeout(() => router.push("/"), 2000)
        }

        gameData.target = target.value

        const baseSteps = [
            {
                title:  props.method === 1 ? "find similar "+app.itemName+"s" : "answer tag questions",
                step: PR_STEPS.GAME
            },{
                title: "select similar "+app.itemName+"s",
                step: PR_STEPS.SELECT
            },{
                title: "enrich and submit",
                step: PR_STEPS.REFINE
            }
        ]

        if (gameData.comprehension.length > 0) {
            gameData.steps = [{
                title: "test your game knowledge",
                value: PR_STEPS.COMPREHENSION
            }].concat(baseSteps)
        } else {
            gameData.steps = baseSteps
        }

        // get comprehension check data
        try {
            gameData.comprehension = await loadComprehensionData(target.value.id)
        } catch(e) {
            console.error(e.toString())
            toast.error("error loading comprehension check data")
            gameData.comprehension = []
        }

        startRound(timestamp)
    }
    function startGame() {
        sounds.stopAll()
        sounds.play(SOUND.START)
        state.value = STATES.START
        // clear previous data
        clear()
        // try to start the round
        tryStartRound(Date.now() - 800)
    }

    async function stopGame() {
        stopTimer()
        state.value = STATES.END
        timeEnd = Date.now()

        // check if we already have a guid
        if (!app.activeUserId) {
            return toast.error("missing identification")
        }

        if (app.getInteractionCount() <= 0) {
            return toast.warning("no interactions recorded")
        }

        const getSource = origin => {
            switch(origin) {
                default:
                case "game": return 1
                case "crowd": return 2
                case "name": return 3
                case "search": return 4
                case "auto": return 5
            }
        }
        const transform = (d, tid) => ({
            item_id: d.id,
            target_id: tid,
            value: d.value,
            source: getSource(d.origin)
        })

        const allItems = gameData.resultItems
            .concat(gameData.customItems)
            .map(d => transform(d, gameData.target.id))

        if (allItems.length === 0) {
            return toast.warning("no similarities specified")
        }

        // get all highly similar items
        const highSim = new Set(allItems.filter(d => d.value > 1).map(d => d.item_id))
        // get all "normally" similar items
        const normalSim = new Set(allItems.filter(d => d.value === 1).map(d => d.item_id))

        // add automatic similarity judgements
        for (let i = 0; i < highSim.length; ++i) {
            // add high similarity for very similar items
            for (let j = i+1; j < highSim.length; ++j) {
                allItems.push(transform({ id: highSim[j], value: 2, origin: "auto" }, highSim[i]))
            }
            // add normal similarity for similar items
            for (let j = 0; j < normalSim.length; ++j) {
                allItems.push(transform({ id: normalSim[j], value: 1, origin: "auto" }, highSim[i]))
            }
        }

        const info = {
            dataset_id: app.ds,
            target_id: gameData.target.id,
            guid: app.activeUserId,
            game_id: props.method,
            timestamp: Date.now(),
            data: {
                start: timeStart,
                end: timeEnd,
                duration: Math.floor((timeEnd-timeStart) / 1000),
                language: window.navigator.language,
                userAgent: window.navigator.userAgent,
                ip: app.ipAddress,
                log: ilog
            }
        }

        try {
            // check whether this client should be blocked (e.g. too many requests)
            await getClientStatus()
            console.info("client status is OK")
        } catch (e) {
            console.error(e.toString())
            toast.error("blocked due to suspicious activity", { timeout: 1500, position: POSITION.TOP_CENTER })
            goHome(2000)
        }

        try {
            // post the similarity data to the backend
            await addSimilarity(info, allItems)
            // fetch common similar items for all players
            const set = new Set(allItems.map(d => d.item_id))
            const other = await getSimilarByTarget(gameData.target.id)
            gameData.otherItems = other.map(d => ({ id: d["item_id"], same: set.has(d["item_id"]) }))
            // tell the parent we're done so that items get updated
            emit("end")
        } catch(e) {
            console.error(e.toString())
            toast.error("error adding similarity")
        }
    }

    function close() {
        emit("close")
        reset()
    }

    function clear() {
        step.value = PR_STEPS.COMPREHENSION
        ilog = null
        attentionDone = false
        attentionNext = null
        stepIndex.value = 1
        candidates.value = []
        gameData.target = null
        gameData.resultItems = []
        gameData.customItems = []
        gameData.otherItems = []
        gameData.comprehension = []
        app.resetInteraction()
    }
    function reset() {
        state.value = STATES.START
        clear()
    }

    function goHome(delay=0) {
        emit("cancel", delay)
    }

    async function init () {
        reset()
        if (!target.value) {
            toast.warning("missing target")
            return goHome(500)
        }

        startGame()
    }

    onMounted(init)

    watch(target, init)
    watch(() => props.method, init)

</script>

