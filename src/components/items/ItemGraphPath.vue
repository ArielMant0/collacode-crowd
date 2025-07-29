<template>
    <div style="width: min-content" class="pa-2">

        <div class="d-flex align-center">

            <v-btn
                class="text-lowercase mr-2"
                id="prev-btn"
                density="comfortable"
                variant="outlined"
                icon="mdi-arrow-left"
                :disabled="!hasPrev"
                @click="prevClusters">
            </v-btn>

            <div id="cluster-options" class="d-flex align-start justify-center">
                <ItemSimilarityRow v-for="(index, idx2) in clsGroups[clsOrder.list]"
                    :items="clusters.clusters[index]"
                    :show-index="clsOrder.show[idx2]"
                    :targets="target ? [target] : []"
                    :image-width="imageWidth"
                    :image-height="imageHeight"
                    :highlights="selection.filter(d => d && d.cluster === index).map(d => d.id)"
                    class="mb-1 mr-3 ml-3"
                    hide-buttons
                    vertical
                    @dragstart-item="d => onStartDrag(d.id, 'cluster-drag')"
                    @click="d => toggleItem(d.id, 'cluster')"
                    @click-item="d => toggleItem(d.id, 'cluster')"/>
            </div>

            <v-btn
                class="text-lowercase ml-2"
                id="next-btn"
                density="comfortable"
                variant="outlined"
                icon="mdi-arrow-right"
                :disabled="!hasNext"
                @click="nextClusters">
            </v-btn>
        </div>

        <div class="d-flex justify-space-around mt-8 mb-8 pa-2">
            <div v-for="(sel, i) in selection" class="mr-1 ml-1 seed">
                <ItemTeaser v-if="sel"
                    :id="sel.id"
                    prevent-open
                    prevent-context
                    rounded
                    @click="removeSelection(i, 'selection')"
                    @dragover.prevent
                    @drop="onDrop(i)"
                    @dragstart="onStartDrag(sel.id, 'selection-drag')"
                    draggable
                    :width="imageWidth"
                    :height="imageHeight"/>
                <v-card v-else
                    :min-width="imageWidth"
                    :min-height="imageHeight"
                    :max-width="imageWidth"
                    :max-height="imageHeight"
                    @dragover.prevent
                    @drop="onDrop(i)"
                    color="surface-light"
                    class="d-flex pa-1 align-center justify-center prevent-select">
                    <v-icon size="large">mdi-image-area</v-icon>
                </v-card>
            </div>
        </div>

        <div id="bottom-part" class="d-flex align-start" style="min-width: 100%; max-width: 100%;">

            <div class="mr-2" style="max-width: 20%;" :style="{ minWidth: (miniImageWidth+25)+'px' }">
                <div style="text-align: center;">
                    <v-icon>mdi-history</v-icon>
                    history
                </div>
                <v-sheet class="pa-2" rounded="lg" border
                    :style="{
                        width: '100%',
                        minHeight: ((miniImageHeight+10)*5)+'px',
                        maxHeight: ((miniImageHeight+10)*5)+'px',
                        overflowY: 'auto',
                    }">
                    <ItemTeaser v-for="id in history"
                        :id="id"
                        prevent-open
                        prevent-context
                        :width="miniImageWidth-5"
                        :height="miniImageHeight-10"
                        draggable
                        class="mb-1"
                        @click="toggleItem(id, 'history')"
                        @dragstart="onStartDrag(id, 'history-drag')"/>
                </v-sheet>
            </div>

            <div id="collected-items" class="ml-2" style="width: 100%;">
                <div style="text-align: center;">similar {{ app.itemName }}s</div>
                <v-sheet class="pa-2" rounded border :style="{ width: '100%', height: ((miniImageHeight+10)*5)+'px' }">
                    <div class="d-flex justify-start align-start">
                        <div v-for="list in candidates" :style="{ maxWidth: Math.floor(100/selectionItems.length)+'%' }">
                            <div class="d-flex flex-wrap justify-center">
                                <ItemTeaser v-for="id in list"
                                    class="mr-1 mb-1"
                                    :id="id"
                                    :border-color="isSelectedItem(id) ? theme.current.value.colors.secondary : undefined"
                                    :border-size="3"
                                    prevent-open
                                    prevent-context
                                    draggable
                                    @click="toggleItem(id, 'suggestions')"
                                    @dragstart="onStartDrag(id, 'suggestions-drag')"
                                    :width="miniImageWidth"
                                    :height="miniImageHeight"/>
                            </div>
                        </div>
                    </div>
                </v-sheet>
            </div>
        </div>
    </div>
</template>

<script setup>
    import * as d3 from 'd3'
    import { ref, onMounted, reactive, computed, onBeforeUnmount, onUpdated } from 'vue';
    import DM from '@/use/data-manager';
    import { getItemClusters } from '@/use/clustering';
    import ItemSimilarityRow from './ItemSimilarityRow.vue';
    import { useApp } from '@/stores/app';
    import ItemTeaser from './ItemTeaser.vue';
    import { useTheme } from 'vuetify';
    import { useShepherd } from 'vue-shepherd'
    import { offset } from '@floating-ui/vue';
    import { SOUND, useSounds } from '@/stores/sounds';

    const app = useApp()
    const theme = useTheme()
    const sounds = useSounds()

    let tutorialNeedsNext = false
    const tutorial = useShepherd({
        useModalOverlay: true,
        defaultStepOptions: {
            classes: 'shadow-md bg-surface-light arrow-primary',
            scrollTo: { behavior: 'smooth', block: 'start' },
            modalOverlayOpeningPadding: 8,
            modalOverlayOpeningRadius: 4,
            floatingUIOptions: { middleware: [offset(25)] }
        }
    })
    tutorial.on("complete", onEndTutorial)
    tutorial.on("cancel", onCancelTutorial)

    const props = defineProps({
        numClusters: {
            type: Number,
            default: 5
        },
        imageWidth: {
            type: Number,
            default: 160
        },
        imageHeight: {
            type: Number,
            default: 80
        },
        maxItems:{
            type: Number,
            default: 30
        },
        maxSelect:{
            type: Number,
            default: 3
        },
        target: {
            type: Number,
        },
    })

    const emit = defineEmits(["ready", "tutorial-start", "tutorial-complete", "tutorial-cancel"])

    const selection = ref(new Array(props.maxSelect))
    const selectionItems = computed(() => selection.value.filter(d => d !== null && d !== undefined))
    const candidates = ref([])
    const clsOrder = reactive({
        list: [],
        selected: new Set(),
        show: []
    })

    const clsIndex = ref(0)
    const clsGroups = ref([])
    const hasPrev = computed(() => clsIndex.value > 0)
    const hasNext = computed(() => clsIndex.value < clsGroups.value.length)

    const numCls = ref(0)
    const numClsLeft = ref(0)

    const miniImageWidth = computed(() => Math.max(50, Math.round(props.imageWidth * 0.66)))
    const miniImageHeight = computed(() => Math.round(miniImageWidth.value * 0.5))


    let itemsToUse
    let log = []
    let candidateItems = []
    let clusters = null, maxClsSize = 0
    let lastIndexUsed = 0

    const history = ref([])
    const clusterLeft = new Set()

    let dragId = null, dragSrc = null


    function onStartDrag(id, source="") {
        app.addInteraction("step1")
        dragId = id
        dragSrc = source
    }

    function onDrop(target=0) {
        if (target < props.maxSelect) {
            toggleItem(dragId, dragSrc, target)
        } else {
            app.addInteraction("step1")
        }
        dragId = null
        dragSrc = null
    }

    function getFreeSelectionIndex() {
        for (let i = 0; i < props.maxSelect; ++i) {
            if (selection.value[i] === undefined || selection.value[i] === null) {
                return i
            }
        }
        return lastIndexUsed
    }

    function isSelectedItem(id) {
        return selection.value.find(d => d && d.id === id)
    }

    function getCandidates() {
        if (selectionItems.value.length === 0) return []

        // get candidates for all selected items
        const num = Math.min(selectionItems.value.length, props.maxSelect)

        const counts = []
        let rest = props.maxItems
        let step = Math.floor(props.maxItems / num)
        for (let i = 0; i < num; ++i) {
            counts.push(i === num-1 ? rest : step)
            rest -= step
        }

        const final = []
        const idSet = new Set()

        selectionItems.value.forEach(d => idSet.add(d.id))

        const k = clusters.clusters.length
        // get indices of remaining clusters
        const cf = [...Array(k).keys()]

        selectionItems.value.forEach((sel, i) => {
            const s1 = Math.ceil(counts[i] * 0.5)
            // for half the items, select the most similar items
            const cands1 = clusters.pwd[sel.index].map((v, j) => ({ index: j, value: v }))
            cands1.sort((a, b) => a.value - b.value)

            const added = []
            // add similar items
            for (let j = 0; j < cands1.length && added.length < s1; ++j) {
                const item = itemsToUse[cands1[j].index]
                if (added.length < s1 && (!idSet.has(item.id) || j === 0)) {
                    added.push(item)
                    idSet.add(item.id)
                }
            }

            // for the other half, select items from similar clusters
            const cands2 = cf.map(d => {
                let score
                if (sel.cluster === d) {
                    score = 1
                } else {
                    score = matchValue(
                        clusters.minDistances[d][sel.cluster],
                        clusters.maxDistances[d][sel.cluster],
                        clusters.size[d],
                        1, // should be similar to chosen cluster
                    )
                }

                return {
                    index: d,
                    value: score,
                }
            })
            // sort from high to low match value
            cands2.sort((a, b) => {
                if (b.value === a.value) {
                    return clusters.size[b.index] - clusters.size[a.index]
                }
                return b.value - a.value
            })

            // add items from similar clusters
            for (let j = 0; j < cands2.length && added.length < counts[i]; ++j) {
                const list = clusters.clusters[cands2[j].index]
                list.forEach(item => {
                    if (added.length < counts[i] && !idSet.has(item.id)) {
                        added.push(item)
                        idSet.add(item.id)
                    }
                })
            }

            final.push(added)
        })

        return final
    }

    function matchValue(mindist, maxdist, size, similar, pow=4) {
        // const v = similar > 0.5 ? 1-mindist : mindist
        return similar > 0.5 ?
            1-maxdist :
            mindist * (mindist ** pow) * size
    }

    function setClusterIndex(index) {
        if (index >= 0 && index <= clsGroups.value.length) {
            clsIndex.value = index
            clsOrder.list = clsIndex.value
            clsOrder.show = clsGroups.value[clsIndex.value].map(() => 0)
        }
    }

    function prevClusters() {
        if (hasPrev.value) {

            if (tutorial.isActive()) {
                const sid = tutorial.getCurrentStep()
                if (sid.id === "cls-prev") {
                    tutorialNeedsNext = true
                }
            }

            setClusterIndex(clsIndex.value-1)

            logAction({
                desc: "previous clusters",
                clusters: clsGroups.value[clsIndex.value]
            })
            app.addInteraction("step1")
        }
    }
    function nextClusters() {
        if (hasNext.value) {

            if (tutorial.isActive()) {
                const sid = tutorial.getCurrentStep()
                if (sid.id === "cls-next") {
                    tutorialNeedsNext = true
                }
            }

            setClusterIndex(clsIndex.value+1)

            logAction({
                desc: "next clusters",
                clusters: clsGroups.value[clsIndex.value]
            })
            app.addInteraction("step1")
        }
    }


    /**
     * Prepare the guided tour tutorial
     */
    function prepareTutorial() {
        const single = app.itemName
        const plural = single + "s"
        tutorial.addSteps([
            {
                id: "t-start",
                buttons: [
                    { text: "close tutorial", action: tutorial.cancel, classes: "bg-error" },
                    { text: "next", action: tutorial.next, classes: "bg-primary" },
                ],
                text: `This tutorial will explain your task and how this tool works.`
            },{
                id: "show-timer",
                attachTo: {
                    element: ".timer",
                    on: "bottom"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `This timer shows you how much time you have left for each step.
                    If you are not done by the time it ends, we automatically go to the
                    next step with your current results.`
            },{
                id: "show-target",
                attachTo: {
                    element: "#sim-target",
                    on: "bottom"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `This is your target ${single}. Your task is to find
                    <b>other similar ${plural}</b> from our dataset.`
            },{
                id: "show-clusters",
                attachTo: {
                    element: "#cluster-options",
                    on: "bottom"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `These are different groups of ${plural} from our dataset.
                    Click or drag any ${single} to get a list of similar ${plural} shown below.
                    You can select up to 3 ${plural} to get suggestions of similar ${plural}.`
            },{
                id: "click-item",
                attachTo: {
                    element: "#cluster-options .item-teaser",
                    on: "right-start"
                },
                text: `Click on this ${single} to see other similar ${plural}.`
            },{
                id: "show-collected",
                attachTo: {
                    element: "#collected-items",
                    on: "top"
                },
                text: `These are now your collected similar ${plural} from which you will select
                    the most similar ${plural} to your target in the next step. You can add
                    other ${plural} by clicking on a different ${single} here or in a group.
                    Click on another ${single} from this list!`
            },{
                id: "collected-update",
                attachTo: {
                    element: "#bottom-part",
                    on: "top"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `Now your collection split in two, showing a total of ${props.maxItems}
                    similar ${plural} for your selected ${plural}.`
            },{
                id: "remove-item",
                attachTo: {
                    element: ".seed",
                    on: "top"
                },
                text: `Click on this ${single} again to remove it from your selection.`
            },{
                id: "cls-next",
                attachTo: {
                    element: "#next-btn",
                    on: "bottom"
                },
                text: `Click here to get a see the next groups of ${plural}.`
            },{
                id: "cls-prev",
                attachTo: {
                    element: "#prev-btn",
                    on: "bottom"
                },
                text: `Click here to go back to the previous groups of ${plural}.`
            },{
                id: "submit",
                attachTo: {
                    element: "#submit-btn",
                    on: "bottom"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `When you are happy with your list of similar ${plural}, click
                    here to go to the next step.`
            },{
                id: "show-tutorial",
                attachTo: {
                    element: "#start-tutorial",
                    on: "left"
                },
                buttons: [{ text: "okay", action: tutorialClear, classes: "bg-primary" }],
                text: "To see tutorial again, just click on this question mark."
            }
        ])
    }
    function startTutorial() {
        // emit event so that things like timers can be cancelled
        emit("tutorial-start")
        tutorial.start()
    }

   function onEndTutorial() {
        // emit event so that things like timers can be started again
        emit("tutorial-complete")
    }

    function onCancelTutorial() {
        // emit event so that things like timers can be started again
        emit("tutorial-cancel")
    }

    function tutorialClear() {
        tutorialNeedsNext = false
        tutorial.complete()
        history.value = []
        setClusterIndex(0)
        clearSelection()
    }

    async function init() {
        if (!clusters) {
            if (itemsToUse.length === 0) {
                return console.debug("no items")
            }

            const metric = "euclidean"
            clusters = getItemClusters(itemsToUse, metric)
            clusterLeft.clear()
            maxClsSize = 0

            clusters.clusters.forEach((_, i) => {
                clusterLeft.add(i)
                maxClsSize = Math.max(maxClsSize, clusters.size[i])
            })

            numCls.value = clusterLeft.size
            numClsLeft.value = clusterLeft.size

            if (!clusters) {
                return console.debug("no clusters found")
            }
        }

        makeClusterGroups()
    }

    async function makeClusterGroups() {

        const k = clusters.clusters.length

        const allCf = [...Array(k).keys()]
        const groups = []

        while (clusterLeft.size > 0) {

            // get indices of all clusters
            const cf = allCf.filter(i => clusterLeft.has(i))

            if (cf.length === 0) {
                console.debug("no more clusters left")
                break
            }

            // get next clusters with the highest distances to each other
            const subset = cf.slice(0, props.numClusters*3)
            const tmp = subset.map(i => {
                const scores = subset.map((d, j) => {
                    if (i === j) return 0
                    return matchValue(
                        clusters.minDistances[d][i],
                        clusters.maxDistances[d][i],
                        clusters.size[i],
                        0, // should be different to the others
                    )
                })

                return {
                    index: i,
                    value: d3.median(scores),
                }
            })

            // sort from high to low match value
            tmp.sort((a, b) => {
                if (b.value === a.value) {
                    return clusters.size[b.index] - clusters.size[a.index]
                }
                return b.value - a.value
            })

            const next = tmp.slice(0, props.numClusters).map(d => d.index)
            next.forEach(d => clusterLeft.delete(d))

            groups.push(next)
        }

        clsGroups.value = groups
        clsOrder.list = 0
        clsOrder.show = clsGroups.value[0].map(() => 0)

        // log which clusters are shown to the user
        logAction({
            desc: "set cluster options",
            clusters: clsGroups.value.map(list => list.map(ci => ({
                id: ci,
                items: clusters.clusters[ci].map(d => d.id)
            }))),
        })
    }

    function updateCandidates() {
        // update list of candidates
        const cand = getCandidates()
        candidateItems = cand.flat()
        candidates.value = cand.map(list => list.map(d => d.id))
        emit("ready", candidates.value.length > 0)
    }

    function toggleItem(id, source="", target=null) {
        const index = selection.value.findIndex(d => d && d.id === id)

        // get the new index
        const newIdx = target !== null ? target : getFreeSelectionIndex()
        if (newIdx < 0) return

        const add = index < 0 || selection.value[index].id !== id
        const move = index >= 0 && target !== null && newIdx !== index
        const replace = index < 0 && newIdx >= 0 && selection.value[newIdx]

        if (tutorial.isActive()) {
            const sid = tutorial.getCurrentStep()
            if (sid.id === 'click-item' || sid.id === 'show-collected' || sid.id === 'remove-item') {
                tutorialNeedsNext = true
            }
        }

        // move the item to another position
        if (move) {
            selection.value[newIdx] = selection.value[index]
            selection.value[index] = null
            lastIndexUsed = newIdx
            app.addInteraction("step1")
            updateCandidates()
        } else if (replace || add) {
            // get the necessary data
            const csi = clusters.clusters.findIndex(list => list.find(d => d.id === id))
            const selObj = {
                id: id,
                cluster: csi,
                index: itemsToUse.findIndex(d => d.id === id)
            }
            // perform replacement or adding
            if (replace) {
                replaceSelection(newIdx, selObj, source)
            } else {
                addSelection(newIdx, selObj, source)
            }
            lastIndexUsed = newIdx
        } else {
            removeSelection(index, source)
            lastIndexUsed = index
        }

        sounds.play(SOUND.PLOP)
    }

    function addToHistory(id) {
        if (history.value.length === 0 || history.value.at(0) !== id) {
            history.value.unshift(id)
            if (history.value.length > 75) {
                history.value = history.value.slice(0, 50)
            }
        }
    }

    function addSelection(index, object, source="") {
        logAction({
            desc: "add item",
            source: source,
            item: object.id
        })
        app.addInteraction("step1")

        // add the cluster to the list of selected clusters
        clsOrder.selected.add(object.cluster)
        // set the selected item
        selection.value[index] = object
        addToHistory(object.id)
        updateCandidates()
    }

    function removeSelection(index, source="") {
        if (selection.value[index]) {
            logAction({
                desc: "remove item",
                source: source,
                item: selection.value[index].id
            })
            app.addInteraction("step1")

            const c = selection.value[index].cluster
            const numCls = selectionItems.value.reduce((acc, d) => acc + (d.cluster === c ? 1 : 0), 0)
            // remove cluster highlight (if this was the only related item)
            if (numCls === 1) {
                clsOrder.selected.delete(selection.value[index].cluster)
            }
            selection.value[index] = null

            // update candidates for suggestion
            updateCandidates()

            if (tutorial.isActive()) {
                const sid = tutorial.getCurrentStep()
                if (sid.id === 'remove-item') {
                    tutorialNeedsNext = true
                }
            }
        }
    }

    function clearSelection() {
        clsOrder.selected.clear()
        selection.value = selection.value.map(() => null)
        // update candidates for suggestion
        updateCandidates()
    }

    function replaceSelection(index, replacement, source="") {
        if (selection.value[index]) {
            logAction({
                desc: "replace item",
                source: source,
                item: replacement.id,
                previous: selection.value[index].id
            })
            app.addInteraction("step1")

            const c = selection.value[index].cluster
            const numCls = selectionItems.value.reduce((acc, d) => acc + (d.cluster === c ? 1 : 0), 0)
            // remove cluster highlight (if this was the only related item)
            if (numCls === 1) {
                clsOrder.selected.delete(selection.value[index].cluster)
            }
            selection.value[index] = replacement
            clsOrder.selected.add(replacement.cluster)
            addToHistory(replacement.id)
            // update candidates for suggestion
            updateCandidates()
        }
    }

    function reset(update=true) {
        log = []
        tutorialNeedsNext = false
        history.value = []
        clusterLeft.clear()
        numCls.value = clusterLeft.size
        numClsLeft.value = clusterLeft.size
        itemsToUse = DM.getDataBy("items", d => d.allTags.length > 0 && (!props.target || d.id !== props.target))
        clusters = null
        clsIndex.value = 0
        clsGroups.value = []
        clsOrder.list = 0
        clsOrder.selected.clear()
        clsOrder.show = []
        selection.value = new Array(props.maxSelect)
        candidates.value = []
        candidateItems = []
        if (update) {
            init()
        }
    }

    function logAction(obj) {
        obj.timestamp = Date.now()
        log.push(obj)
    }

    function getSubmitData() {
        return {
            candidates: candidateItems,
            log: log
        }
    }

    defineExpose({ reset, getSubmitData, startTutorial })

    onUpdated(() => {
        if (tutorialNeedsNext) {
            tutorialNeedsNext = false
            tutorial.next()
        }
    })
    onBeforeUnmount(() => {
        sounds.stopAll()
        if (tutorial.isActive()) {
            tutorial.cancel()
        }
    })

    onMounted(function() {
        prepareTutorial()
        reset(false)
        init()
    })

</script>