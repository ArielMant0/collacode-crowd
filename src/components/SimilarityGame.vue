<template>
    <div>
        <div v-if="state === STATES.INGAME && notInCheck"
            style="max-width: 300px; position: absolute; top: 60px; left: 5px; pointer-events: none;">

            <v-stepper-vertical flat :model-value="stepIndex" class="mr-4 cursor-default" hide-actions>
                <template #default>
                    <v-stepper-vertical-item  v-for="(s, idx) in gameData.steps"
                        bg-color="transparent"
                        :title="s.title"
                        :value="idx+1"
                        color="primary text-wrap"
                        :complete="s.step < step">

                        <template #title="{ title }">
                            <span style="font-size: small;">{{ title }}</span>
                        </template>
                    </v-stepper-vertical-item>
                </template>
            </v-stepper-vertical>
        </div>

        <div v-if="state === STATES.START"class="d-flex align-center justify-center">
            <LoadingScreen/>
        </div>

        <div v-if="state === STATES.INGAME && step === PR_STEPS.GAME" style="position: absolute; top: 560x; right: 10px;">
            <v-tooltip text="start the tutorial" location="left" open-delay="100">
                <template v-slot:activator="{ props }">
                    <v-btn v-bind="props"
                        id="start-tutorial"
                        icon="mdi-help-circle"
                        @click="startTutorial"
                        class="mt-2"
                        density="compact"
                        variant="flat"/>
                </template>
            </v-tooltip>
        </div>

        <div v-if="state === STATES.INGAME || state === STATES.END" class="d-flex flex-column align-center" style="width: 100%; max-width: 100%;">

            <div class="d-flex align-center justify-center mb-4">
                <div v-if="notInCheck" class="d-flex flex-column align-center">
                    <div style="max-width: 300px;" class="text-dots">{{ gameData.target.name }}</div>
                    <ItemTeaser
                        element-id="sim-target"
                        :item="gameData.target"
                        :width="180"
                        :height="90"
                        :prevent-click="state !== STATES.END"
                        :prevent-open="state !== STATES.END"
                        :prevent-context="state !== STATES.END"/>
                </div>

                <div v-if="state === STATES.INGAME" class="ml-8">
                    <Timer v-if="showTimer" ref="timer" class="mb-2" :time-in-sec="timeInSec" @end="nextStep(true)"/>
                    <v-btn v-if="notInCheck"
                        id="submit-btn"
                        :color="allowNext ? 'primary' : 'default'"
                        :disabled="!allowNext"
                        @click="nextStep(false)"
                        block>
                        {{ isLastStep ? 'submit' : 'next step' }}
                    </v-btn>
                </div>
            </div>
        </div>

        <div v-if="state === STATES.INGAME" class="d-flex flex-column align-center" style="width: 100%; max-width: 100%;">

            <div v-if="step === PR_STEPS.COMPREHENSION" class="mt-8">
                <ComprehensionCheck
                    ref="cc"
                    :title="target.name"
                    :questions="gameData.comprehension"
                    @submit="testComp"/>
            </div>
            <div v-else-if="step === PR_STEPS.GAME">
                <ItemGraphPath v-if="method === GAME_IDS.CLUSTERS"
                    ref="clusters"
                    @ready="isReady => allowNext = isReady"
                    @tutorial-start="onTutorialStart"
                    @tutorial-complete="onTutorialStop(true)"
                    @tutorial-cancel="onTutorialStop(false)"
                    :max-items="30"
                    :target="gameData.target.id"/>
                <ItemBinarySearch v-else
                    ref="binsearch"
                    :min-items="30"
                    :max-items="30"
                    @ready="isReady => allowNext = isReady"
                    @tutorial-start="onTutorialStart"
                    @tutorial-complete="onTutorialStop(true)"
                    @tutorial-cancel="onTutorialStop(false)"
                    :target="gameData.target.id"/>
            </div>
            <div v-else-if="step === PR_STEPS.SELECT && state === STATES.INGAME" class="mb-8" style="width: 95%; max-width: 100%;">
                <ItemTagRecommend
                    :item-limit="10"
                    :items="candidates"
                    @update="setResultItems"/>
            </div>
            <div v-else-if="step === PR_STEPS.REFINE && state === STATES.INGAME" class="mb-8" style="width: 95%; max-width: 100%;">
                <ItemCustomRecommend
                    :item-limit="10"
                    :target="gameData.target.id"
                    :items="gameData.resultItems"
                    @search="setSearchHistory"
                    @update="setAdditionalItems"/>
            </div>

            <div v-else-if="step === PR_STEPS.ATTENTION && state === STATES.INGAME">
                <AttentionCheck @submit="testAttention"/>
            </div>
        </div>

        <div v-else-if="state === STATES.END" class="d-flex flex-column align-center" style="width: 100%; max-width: 100%;">

            <div class="mt-4 d-flex flex-column align-center">

                <div class="d-flex align-center justify-center mb-4">
                    <v-btn v-if="app.isCrowdWorkerReady" color="primary" @click="goToFeedback">go to feedback page</v-btn>
                    <v-btn v-else color="error" @click="close">back to home</v-btn>
                </div>

                <div style="max-width: 100%; text-align: center;">
                    <div class="bitcount-prop-double" style="font-size: 30px;">Your Choices</div>
                    <div class="d-flex flex-wrap justify-center" :style="{ maxWidth: (190*5)+'px' }">
                        <ItemTeaser v-for="item in gameData.resultItems"
                            :id="item.id"
                            prevent-click
                            prevent-context
                            :width="140"
                            :height="70"
                            class="mr-1 mb-1"/>
                        <ItemTeaser v-for="item in gameData.customItems"
                            :id="item.id"
                            prevent-click
                            prevent-context
                            :width="140"
                            :height="70"
                            class="mr-1 mb-1"/>
                    </div>
                </div>
                <div v-if="gameData.graph" class="mt-4" style="max-width: 100%; text-align: center;">
                    <div class="bitcount-prop-double" style="font-size: 30px;">Similarity Graph</div>
                    <NodeLink v-if="gameData.graph"
                        :nodes="gameData.graph.nodes"
                        :links="gameData.graph.links"
                        :width="600"
                        :height="400"
                        weight-attr="value"
                        image-attr="teaser"
                        @hover="onHover"
                        :selectable="false"
                        :radius="50"
                        :target="gameData.target.id"/>

                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed, onBeforeUnmount, onMounted, reactive, useTemplateRef, watch } from 'vue'
    import { GAME_IDS, STATES } from '@/stores/games'
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
    import { constructSimilarityGraph } from '@/use/utility';
    import NodeLink from './vis/NodeLink.vue';
    import { useTooltip } from '@/stores/tooltip';

    const emit = defineEmits(["end", "close", "cancel"])

    // stores
    const app = useApp()
    const tt = useTooltip()
    const sounds = useSounds()
    const toast = useToast()

    const { target } = storeToRefs(app)

    const timer = useTemplateRef("timer")
    const clusters = useTemplateRef("clusters")
    const binsearch = useTemplateRef("binsearch")
    const cc = useTemplateRef("cc")

    const allowNext = ref(true)
    const step = ref(PR_STEPS.COMPREHENSION)
    const stepIndex = ref(1)
    const candidates = ref([])
    const isLastStep = computed(() => {
        if (!props.attentionChecks) {
            return step.value === PR_STEPS.REFINE
        }
        return attentionDone && step.value === PR_STEPS.REFINE ||
            !attentionDone && step.value === PR_STEPS.ATTENTION
    })

    let ilog = null, compdata = null
    let attentionDone = false, attentionNext = null
    let timeStart, timeEnd
    let timeStartTutorial, timeEndTutorial
    let tabChangeWarning = false, numTabChanged = 0
    let searchHistory = []

    let homeRedirect = null

    const props = defineProps({
        method: {
            type: Number,
            required: true,
            validator: v => v === GAME_IDS.CLUSTERS || v === GAME_IDS.BINSEARCH
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

    const state = ref(STATES.START)

    const notInCheck = computed(() => step.value !== PR_STEPS.ATTENTION && step.value !== PR_STEPS.COMPREHENSION)
    const showTimer = computed(() => props.useTimer && state.value === STATES.INGAME)

    const timeInSec = computed(() => {
        switch (step.value) {
            // attention check
            case PR_STEPS.ATTENTION:
                return 15

            // game phase
            case PR_STEPS.GAME:
                return 240

            // selection phases
            case PR_STEPS.SELECT:
                return 120

            // comprehension check
            case PR_STEPS.COMPREHENSION:
            // last refinement of games
            case PR_STEPS.REFINE:
            default:
                return 60
        }
    })

    // game related stuff
    const gameData = reactive({
        target: null,
        steps: [],
        resultItems: [],
        customItems: [],
        graph: null,
        comprehension: [],
        timePerStep: {},
        durPerStep: {},
        stepOrder: [],
    })


    let tutorialDone = false
    let userGeoLoc = null

    // ---------------------------------------------------------------------
    // Functions
    // ---------------------------------------------------------------------

    function startTimer(delay=0) {
        if (props.useTimer) {
            if (timer.value) {
                if (delay > 0) {
                    setTimeout(() => timer.value.start(), delay)
                } else {
                    timer.value.start()
                }
            } else {
                setTimeout(startTimer, 100)
            }
        }
    }
    function pauseTimer() {
        if (props.useTimer) {
            if (timer.value) {
                timer.value.pause()
            } else {
                setTimeout(pauseTimer, 100)
            }
        }
    }
    function unpauseTimer() {
        if (props.useTimer) {
            if (timer.value) {
                timer.value.unpause()
            } else {
                setTimeout(unpauseTimer, 100)
            }
        }
    }
    function stopTimer() {
        if (props.useTimer) {
            if (timer.value) {
                timer.value.stop()
            } else {
                setTimeout(stopTimer, 100)
            }
        }
    }

    function onTutorialStart() {
        pauseTimer()
    }
    function onTutorialStop(completed) {
        localStorage.setItem("tutorial_"+props.method, true)
        tutorialDone = tutorialDone || completed
        // only record the first time the tutorial is done
        if (timeEndTutorial === undefined) {
            timeEndTutorial = Date.now()
            gameData.timePerStep.tutorial = timeEndTutorial
            gameData.durPerStep.tutorial = timeEndTutorial-timeStartTutorial
        }
        unpauseTimer()
    }
    function checkTutorial() {
        if (!tutorialDone && step.value === PR_STEPS.GAME) {
            startTutorial()
        }
    }
    function startTutorial() {
        // get the data from clusters/binary search
        if (clusters.value) {
            clusters.value.startTutorial()
            timeStartTutorial = Date.now()
        } else if (binsearch.value) {
            binsearch.value.startTutorial()
            timeStartTutorial = Date.now()
        }
    }

    function onHover(item=null, event=null) {
        if (item !== null) {
            tt.showItem(event, item)
        } else {
            tt.hide()
        }
    }

    function setFirstStep() {
        if (gameData.comprehension.length > 0) {
            allowNext.value = true
            step.value = PR_STEPS.COMPREHENSION
        } else {
            allowNext.value = false
            step.value = PR_STEPS.GAME
        }
        stepIndex.value = 1
        setTimeout(checkTutorial, 200)
    }

    function logStepTime(name) {
        const last = gameData.stepOrder.length > 0 ? gameData.stepOrder.at(-1) : null
        const prevTime = last !== null ? gameData.timePerStep[last] : timeStart
        gameData.timePerStep[name] = Date.now()
        gameData.durPerStep[name] = gameData.timePerStep[name] - prevTime
        gameData.stepOrder.push(name)
    }

    function nextStep(onTimerEnd=false) {
        stopTimer()
        switch(step.value) {
            case PR_STEPS.COMPREHENSION:
                logStepTime(PR_STEPS.COMPREHENSION)
                if (onTimerEnd) {
                    // the user did not answer the questions in time
                    testComp(cc.value ? cc.value.getAnswers() : null)
                } else {
                    sounds.play(SOUND.WIN_MINI)
                    allowNext.value = false
                    step.value = PR_STEPS.GAME
                    startTimer(150)
                    setTimeout(checkTutorial, 200)
                }
                break
            case PR_STEPS.GAME: {
                let data
                logStepTime(PR_STEPS.GAME)
                // get the data from clusters/binary search
                if (clusters.value) {
                    data = clusters.value.getSubmitData()
                } else if (binsearch.value) {
                    data = binsearch.value.getSubmitData()
                }

                if (data) {
                    setCandidates(data.candidates, data.log)
                }

                // see if we do the attention check now
                if (!attentionDone && props.attentionChecks && Math.random() > 0.75) {
                    step.value = PR_STEPS.ATTENTION
                    attentionNext = PR_STEPS.SELECT
                    sounds.play(SOUND.ATTENTION)
                } else {
                    step.value = PR_STEPS.SELECT
                    stepIndex.value++
                    sounds.play(SOUND.WIN_MINI)
                }
                allowNext.value = true
                startTimer(150)
                break
            }
            case PR_STEPS.SELECT:
                logStepTime(PR_STEPS.SELECT)
                if (!attentionDone && props.attentionChecks && Math.random() > 0.5) {
                    step.value = PR_STEPS.ATTENTION
                    attentionNext = PR_STEPS.REFINE
                    sounds.play(SOUND.ATTENTION)
                } else {
                    stepIndex.value++
                    step.value = PR_STEPS.REFINE
                    sounds.play(SOUND.WIN_MINI)
                }
                allowNext.value = true
                startTimer(150)
                break
            case PR_STEPS.REFINE:
                logStepTime(PR_STEPS.REFINE)
                if (!attentionDone && props.attentionChecks) {
                    step.value = PR_STEPS.ATTENTION
                    attentionNext = null
                    allowNext.value = true
                    sounds.play(SOUND.ATTENTION)
                    startTimer(150)
                } else {
                    stopGame()
                }
                break
            case PR_STEPS.ATTENTION:
                logStepTime(PR_STEPS.ATTENTION)
                attentionDone = true
                if (onTimerEnd) {
                    // user did not complete attention check in time
                    testAttention(false)
                } else {
                    if (attentionNext !== null) {
                        step.value = attentionNext
                        attentionNext = null
                        stepIndex.value++
                        allowNext.value = true
                        sounds.play(SOUND.WIN_MINI)
                        startTimer(150)
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
                compdata = {
                    questions: gameData.comprehension.map(q => q.question),
                    answersText: answers.map((a, i) => gameData.comprehension[i].options[a].name),
                    answers: answers,
                }
                nextStep()
            } else {
                compdata = null
                sounds.play(SOUND.FAIL_MINI)
                toast.error(
                    "you failed the comprehension check",
                    { timeout: 1500, position: POSITION.TOP_CENTER }
                )
                setTimeout(() => router.replace("/"), 2000)
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
                sounds.play(SOUND.FAIL_MINI)
                await addAttentionFail(target.value.id, props.method)
                toast.error(
                    "you failed the attention check",
                    { timeout: 1500, position: POSITION.TOP_CENTER }
                )
                setTimeout(() => router.replace("/"), 2000)
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
    }

    function setResultItems(items) {
        gameData.resultItems = items
    }
    function setAdditionalItems(items) {
        gameData.customItems = items
    }
    function setSearchHistory(searchTerms) {
        searchHistory = searchTerms
    }

    function startRound(timestamp=null) {
        state.value = STATES.START
        setFirstStep()
        sounds.play(SOUND.START)
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
        compdata = null
        gameData.resultItems = []
        gameData.customItems = []
        gameData.graph = null
        stepIndex.value = 1

        if (!target.value) {
            state.value = STATES.START
            toast.error(
                "select an item in the main page first",
                { timeout: 1500, position: POSITION.TOP_CENTER }
            )
            return setTimeout(() => router.replace("/"), 2000)
        }

        gameData.target = target.value

        const baseSteps = [
            {
                title:  props.method === GAME_IDS.CLUSTERS ?
                    "find similar "+app.itemName+"s" :
                    "answer tag questions",
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
        state.value = STATES.START
        // clear previous data
        clear()
        // try to start the round
        tryStartRound(Date.now() - 800)
    }

    async function stopGame() {
        stopTimer()
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

        // get all highly similar items
        const highSim = new Set(
            allItems
                .filter(d => d.item_id !== gameData.target.id && d.value > 1)
                .map(d => d.item_id)
            )
        // get all "normally" similar items
        const normalSim = new Set(
            allItems
                .filter(d => d.item_id !== gameData.target.id && d.value === 1)
                .map(d => d.item_id)
        )

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

        try {
            // check whether this client should be blocked (e.g. too many requests)
            await getClientStatus()
        } catch (e) {
            console.error(e.toString())
            app.setUserBlocked(true)
            const str = app.isCrowdWorker ?
                "failed too many checks" :
                "blocked due to suspicious activity / too many failed checks"

            toast.error(str, { timeout: 2000, position: POSITION.TOP_CENTER })
            return goHome(2500)
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
                duration: timeEnd-timeStart,
                stepOrder: gameData.stepOrder,
                timePerStep: gameData.timePerStep,
                durationPerStep: gameData.durPerStep,
                language: window.navigator.language,
                userAgent: window.navigator.userAgent,
                tabChanges: numTabChanged,
                searchHistory: searchHistory,
                window: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                location: userGeoLoc,
                ip: app.ipAddress,
                comprehension: compdata,
                log: ilog
            }
        }

        try {
            // post the similarity data to the backend
            const response = await addSimilarity(info, allItems)
            // fetch common similar items for all players
            const sims = await getSimilarByTarget(gameData.target.id)
            gameData.graph = constructSimilarityGraph(sims)
            app.numSubmissions = response.submissions

            // tell the parent we're done so that items get updated
            emit("end")

            // redirect crowd workers
            if (app.isCrowdWorkerReady) {
                toast.info(
                    "In 3 seconds, you will be redirected to the questionnaire.",
                    { position: POSITION.TOP_CENTER, timeout: 1500 }
                )
                setTimeout(function() { router.replace("/feedback") }, 3000)
            } else if (app.isCrowdWorker) {
                // redirect to home after 30 seconds
                homeRedirect = setTimeout(function() {
                    router.replace("/")
                    homeRedirect = null
                }, 30000)
            }

            state.value = STATES.END
            step.value = PR_STEPS.FEEDBACK
            sounds.play(SOUND.WIN)

        } catch(e) {
            console.error(e.toString())
            toast.error("error adding similarity")
        }
    }

    function goToFeedback() {
        router.replace("/feedback")
    }

    function close() {
        sounds.play(SOUND.CLICK)
        emit("close")
        reset()
    }

    function clear() {
        step.value = PR_STEPS.COMPREHENSION
        ilog = null
        compdata = null
        attentionDone = false
        attentionNext = null
        timeEnd = undefined
        timeStart = undefined
        timeEndTutorial = undefined
        timeStartTutorial = undefined
        allowNext.value = true
        stepIndex.value = 1
        candidates.value = []
        gameData.target = null
        gameData.resultItems = []
        gameData.customItems = []
        gameData.graph = null
        gameData.comprehension = []
        gameData.timePerStep = {}
        gameData.durPerStep = {}
        gameData.stepOrder = []
        searchHistory = []
        app.resetInteraction()
    }
    function reset() {
        state.value = STATES.START
        clear()
    }

    function goHome(delay=0) {
        emit("cancel", delay)
    }

    function onTabChange() {
        if (document.hidden) {
            tabChangeWarning = app.isCrowdWorker
            numTabChanged++
        } else if (tabChangeWarning) {
            tabChangeWarning = false
            toast.warning(
                "please do not leave the page during the study",
                {
                    position: POSITION.TOP_CENTER,
                    timeout: 5000
                }
            )
        }
    }

    async function init () {
        reset()

        window.navigator.geolocation.getCurrentPosition(
            function(loc) { userGeoLoc = loc.toJSON() },
            function() { userGeoLoc = null },
            {
                enableHighAccuracy: false,
                timeout: 2000
            }
        )

        numTabChanged = 0
        document.addEventListener("visibilitychange", onTabChange)

        tutorialDone = Boolean(localStorage.getItem("tutorial_"+props.method)) === true

        if (!target.value) {
            toast.warning("missing target")
            return goHome(500)
        }

        startGame()
    }

    onMounted(init)
    onBeforeUnmount(function() {
        if (homeRedirect) {
            clearTimeout(homeRedirect)
            homeRedirect = null
        }
        document.removeEventListener("visibilitychange", onTabChange)
    })

    watch(target, init)
    watch(() => props.method, init)

</script>

