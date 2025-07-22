<template>
    <div style="max-height: 90vh; overflow-y: auto;">
        <div v-if="state === STATES.START" class="d-flex align-center justify-center">
            <v-btn size="x-large" color="primary" class="mt-4" @click="startGame">start</v-btn>
        </div>

        <div v-else-if="state === STATES.LOADING"class="d-flex align-center justify-center">
            <LoadingScreen
                :messages="[
                    'select games to get recommendations of similar games',
                    'you can select up to 3 games',
                    'use the reroll button if you see no similar games',
                    'selected groups will not change when using reroll',
                ]"/>
        </div>

        <div v-else-if="state === STATES.INGAME || state === STATES.END" class="d-flex flex-column align-center" style="width: 100%; max-width: 100%;">

            <div class="ml-2 mr-2 mb-2 d-flex flex-column align-center">
                <div>{{ gameData.target.name }}</div>
                <ItemTeaser
                    :item="gameData.target"
                    :width="180"
                    :height="90"
                    :prevent-click="state !== STATES.END"
                    :prevent-open="state !== STATES.END"
                    :prevent-context="state !== STATES.END"/>
            </div>

            <div v-if="step <= 1">
                <ItemGraphPath v-if="method === 1"
                    @inventory="items => inventory = items"
                    @submit="setCandidates"
                    :target="gameData.target.id"/>
                <ItemBinarySearch v-else
                    :min-items="15"
                    @inventory="items => inventory = items"
                    @submit="setCandidates"
                    :target="gameData.target.id"/>
            </div>
            <div v-else-if="step === 2" class="mt-4 mb-8" style="width: 95%; max-width: 100%;">
                <ItemTagRecommend
                    :item-limit="10"
                    :items="candidates"
                    @update="setResultItems"/>
            </div>
            <div v-else-if="state === STATES.INGAME" class="mt-4 mb-8" style="width: 95%; max-width: 100%;">
                <ItemCustomRecommend
                    :item-limit="10"
                    :target="gameData.target.id"
                    :items="gameData.resultItems"
                    @update="setAdditionalItems"/>
            </div>


            <div v-if="state === STATES.END" class="mb-8 d-flex flex-column align-center" :style="{ maxWidth: (190*5)+'px' }">
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

            <v-btn v-if="state === STATES.INGAME && step === 2" class="ml-1" size="large" color="primary" @click="step = 3">next</v-btn>
            <v-btn v-else-if="state === STATES.INGAME && step === 3" class="ml-1" size="large" color="primary" @click="stopGame">submit</v-btn>
            <div v-if="state === STATES.END" class="d-flex align-center justify-center">
                <v-btn class="mr-1" size="large" color="error" @click="close">close</v-btn>
                <v-btn
                    class="ml-1"
                    size="large"
                    :color="hasNextItem ? 'primary' : 'default'"
                    :disabled="!hasNextItem"
                    @click="startNext">next {{ app.itemName }}</v-btn>
            </div>

        </div>
    </div>
</template>

<script setup>
    import DM from '@/use/data-manager'
    import { cross } from 'd3'
    import { onMounted, reactive, watch } from 'vue'
    import { GR_COLOR, STATES, useGames } from '@/stores/games'
    import { useSounds, SOUND } from '@/stores/sounds';
    import { storeToRefs } from 'pinia'
    import LoadingScreen from './LoadingScreen.vue'
    import ItemTeaser from './items/ItemTeaser.vue'
    import ItemGraphPath from './items/ItemGraphPath.vue'
    import { useApp } from '@/stores/app'
    import ItemBinarySearch from './items/ItemBinarySearch.vue'
    import ItemTagRecommend from './items/ItemTagRecommend.vue'
    import ItemCustomRecommend from './items/ItemCustomRecommend.vue'
    import { addSimilarity, getClientStatus, getCrowdGUID, getSimilarByTarget } from '@/use/data-api'
    import { POSITION, useToast } from 'vue-toastification'
    import router from '@/router'

    const emit = defineEmits(["end", "close"])

    // stores
    const app = useApp()
    const sounds = useSounds()
    const toast = useToast()

    const { target, hasNextItem } = storeToRefs(app)

    const step = ref(1)
    const candidates = ref([])

    let ilog = null
    let timeStart, timeEnd

    const props = defineProps({
        method: {
            type: Number,
            required: true,
            validator: v => v === 1 || v === 2
        }
    })

    // game related stuff
    const state = ref(STATES.START)
    const inventory = ref([])
    const gameData = reactive({
        target: null,
        tagDomain: [],
        resultItems: [],
        customItems: [],
        otherItems: []
    })

    // ---------------------------------------------------------------------
    // Functions
    // ---------------------------------------------------------------------


    function setCandidates(items, logs) {
        candidates.value = items
        ilog = logs
        step.value = 2
    }

    function setResultItems(items) {
        gameData.resultItems = items
    }
    function setAdditionalItems(items) {
        gameData.customItems = items
    }

    function startRound(timestamp=null) {
        state.value = STATES.LOADING
        step.value = 1
        inventory.value = []
        sounds.play(SOUND.START_SHORT)
        setTimeout(
            () => {
                state.value = STATES.INGAME
                timeStart = Date.now()
            },
            1000 - (timestamp !== null ? Date.now()-timestamp : 0)
        )
    }
    function tryStartRound(timestamp=null) {
        ilog = null
        gameData.resultItems = []
        gameData.customItems = []
        gameData.otherItems = []
        if (!target.value) {
            state.value = STATES.START
            toast.error(
                "select an item in the main page first",
                { timeout: 1000, position: POSITION.TOP_CENTER }
            )
            setTimeout(() => router.push("/"), 1500)
            return
        }
        gameData.target = target.value
        startRound(timestamp)
    }
    function startGame() {
        sounds.stopAll()
        sounds.play(SOUND.START)
        state.value = STATES.LOADING
        reroll()
    }
    function startNext() {
        app.chooseRandomTarget()
        startGame()
    }
    function reroll(loading=true) {
        const now = Date.now() - (loading ? 0 : 1000)
        // clear previous data
        clear()
        // get bar code domain
        gameData.tagDomain = DM.getDataBy("tags_tree", d => d.is_leaf === 1).map(d => d.id)
        // try to start the round
        tryStartRound(now)
    }

    async function stopGame() {
        state.value = STATES.END
        timeEnd = Date.now()

        // check if we already have a guid
        if (!app.activeUserId) {
            const guid = await getCrowdGUID()
            localStorage.setItem("crowd-guid", guid)
            app.activeUserId = guid
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

        let allItems = gameData.resultItems
            .concat(gameData.customItems)
            .map(d => transform(d, gameData.target.id))

        // get all highly similar items
        const highSim = new Set(allItems.filter(d => d.value > 1).map(d => d.item_id))
        // make the cross product of highly similar items
        let extra = cross(highSim, highSim)
        // add pairwise high similarity for highly similar items
        allItems = allItems.concat(extra.map(d => transform({ id: d[0], value: 2, origin: "auto" }, d[1])))

        // get all "normally" similar items
        const normalSim = new Set(allItems.filter(d => d.value === 1).map(d => d.item_id))
        // make the cross product of highly similar items with normally similar items
        extra = cross(normalSim, highSim)
        allItems = allItems.concat(extra.map(d => transform({ id: d[0], value: 1, origin: "auto" }, d[1])))

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
            await getClientStatus(info.guid, info.data.ip)
            console.info("client status is OK")
        } catch (e) {
            console.error(e.toString())
            return toast.error("blocked due to suspicious activity", { timeout: 5000, position: POSITION.TOP_CENTER })
        }

        try {
            // post the similarity data to the backend
            await addSimilarity(info, allItems)
            // fetch common similar items for all players
            const set = new Set(allItems.map(d => d.item_id))
            const other = await getSimilarByTarget(gameData.target.id)
            gameData.otherItems = other.map(d => ({ id: d["item_id"], same: set.has(d["item_id"]) }))
            // TODO: update available items for this client
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
        step.value = 1
        ilog = null
        candidates.value = []
        gameData.target = null
        gameData.resultItems = []
        gameData.customItems = []
        gameData.otherItems = []
    }
    function reset() {
        state.value = STATES.START
        clear()
    }

    function init () {
        reset()
        startGame()
    }

    onMounted(init)

    watch(target, init)
    watch(() => props.method, init)

</script>

