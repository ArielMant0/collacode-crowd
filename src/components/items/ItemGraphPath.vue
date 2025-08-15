<template>
    <div style="width: min-content" class="pa-2">

        <div class="d-flex align-center justify-space-between" :style="{ minWidth: (numClusters*200)+'px' }">

            <v-btn
                class="text-lowercase mr-2"
                id="prev-btn"
                density="comfortable"
                variant="outlined"
                icon="mdi-arrow-left"
                :disabled="!hasPrev"
                @click="prevClusters">
            </v-btn>

            <div id="cluster-options" class="d-flex align-start justify-center" style="min-height: 295px;">
                <ItemSimilarityRow v-for="(index, idx2) in clsGroups[clsOrder.list]"
                    :items="clusters.clusters[index]"
                    :show-index="clsOrder.show[idx2]"
                    :targets="target ? [target] : []"
                    :image-width="imageWidth"
                    :image-height="imageHeight"
                    :highlights="selection.filter(d => d && d.cluster === index).map(d => d.id)"
                    class="mb-1 mr-3 ml-3 cluster-group"
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

            <div id="item-history" class="mr-2" style="max-width: 20%;" :style="{ minWidth: (miniImageWidth+25)+'px' }">
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
        keyboardNavigation: false,
        exitOnEsc: false,
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
    const hasNext = computed(() => clsIndex.value < clsGroups.value.length-1)

    const numCls = ref(0)
    const numClsLeft = ref(0)

    const miniImageWidth = computed(() => Math.max(50, Math.round(props.imageWidth * 0.66)))
    const miniImageHeight = computed(() => Math.round(miniImageWidth.value * 0.5))


    let allItems
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
            const s1 = Math.ceil(counts[i] * 0.7)
            // for half the items, select the most similar items
            const cands1 = clusters.pwd[sel.index]
                .map((v, j) => ({ index: j, value: v }))
                .filter(d => allItems[d.index].id !== props.target)

            cands1.sort((a, b) => a.value - b.value)

            const added = []
            // add similar items
            for (let j = 0; j < cands1.length && added.length < s1; ++j) {
                const item = allItems[cands1[j].index]
                if (added.length < s1 && (item.id === sel.id || !idSet.has(item.id))) {
                    added.push(item)
                    idSet.add(item.id)
                }
            }

            // for the other half, select items from similar clusters
            const cands2 = cf.map(d => {
                let score
                if (sel.cluster === d) {
                    score = Number.MAX_VALUE
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

            const rest = counts[i] - s1
            const self = Math.floor(rest * 0.5)
            const s2 = Math.max(1, Math.floor((rest - self) / 2))
            // add items from similar clusters
            for (let j = 0; j < cands2.length && added.length < counts[i]; ++j) {
                const list = clusters.clusters[cands2[j].index].slice()
                list.sort((a, b) => clusters.pwd[sel.index][a._cidx] - clusters.pwd[sel.index][b._cidx])

                let added2 = 0, limit = cands2[j].index === sel.cluster ? self : s2
                for (let l = 0; l < list.length && added2 < limit; ++l) {
                    if (added.length < counts[i] && !idSet.has(list[l].id)) {
                        added.push(list[l])
                        idSet.add(list[l].id)
                        added2++
                    }
                }
            }

            final.push(added)
        })

        return final
    }

    function matchValue(mindist, maxdist, size, similar, pow=4) {
        // const v = similar > 0.5 ? 1-mindist : mindist
        return similar > 0.5 ? 1-maxdist : mindist
            // mindist * (mindist ** pow) * size
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

            sounds.play(SOUND.CLICK)
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

            sounds.play(SOUND.CLICK)
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
                text: `This tutorial will guide you through the features on this page.`
            },{
                id: "show-timer",
                attachTo: {
                    element: ".timer",
                    on: "bottom"
                },
                scrollToHandler: function() {
                    window.scrollTo(0, 0, { behavior: 'smooth' })
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `This timer shows you how much time you have left for each step.
                    If you are not done by the time it ends, the page <b>automatically</b> goes to
                    the next step with your current results.`
            },{
                id: "show-target",
                attachTo: {
                    element: "#sim-target",
                    on: "bottom"
                },
                scrollToHandler: function() {
                    window.scrollTo(0, 0, { behavior: 'smooth' })
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
                    They help you to look through ${plural} more quickly.`
            },{
                id: "show-rect",
                attachTo: {
                    element: () => getFirst(document.querySelectorAll(".cluster-group")),
                    on: "bottom"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `Each group shows images for its first 5 ${plural} - all other
                    ${plural} are shown as grey boxes. You can <b>hover</b> over a box to see
                    the ${single}'s name and image.
                    <div style="min-height: 1em"></div>

                    You can <b>click</b> on any ${single} or <b>drag</b> it into one of the
                    three selection boxes below. Then you get a list of up to ${props.maxItems}
                    similar ${plural} shown at the bottom.`
            },{
                id: "click-item",
                attachTo: {
                    element: "#cluster-options .item-teaser",
                    on: "right-start"
                },
                text: `<b>Select this ${single}!</b>`
            },{
                id: "show-collected",
                attachTo: {
                    element: "#collected-items",
                    on: "top-end"
                },
                text: `<p>These are now your <b>collected similar ${plural}</b> which you refine in
                    the next step. You can add other ${plural} by selecting a different ${single}
                    here or in a group above.
                    <div style="min-height: 1em"></div>
                    <b>Select another ${single} from this list!</b></p>`
            },{
                id: "collected-update",
                attachTo: {
                    element: "#collected-items",
                    on: "top-end"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `Now your collection has <b>split</b>, showing ${props.maxItems} similar ${plural}
                    for your selected ${plural}.`
            },{
                id: "remove-item",
                attachTo: {
                    element: ".seed",
                    on: "top"
                },
                beforeShowPromise: async function() {
                    if (!selection.value[0]) {
                        toggleItem(
                            clusters.clusters[clsGroups.value[clsOrder.list][0]][0].id,
                            "tutorial",
                            0
                        )
                    }
                },
                text: `Click on this ${single} again to remove it from your selection.`
            },{
                id: "cls-next",
                attachTo: {
                    element: "#next-btn",
                    on: "bottom"
                },
                extraHighlights: ["#cluster-options"],
                text: `To see the next groups of ${plural} use the <b>right arrow</b> button.`
            },{
                id: "cls-prev",
                attachTo: {
                    element: "#prev-btn",
                    on: "bottom"
                },
                extraHighlights: ["#cluster-options"],
                text: `To go back to the previous groups of ${plural}, use the <b>left arrow</b> button.`
            },{
                id: "show-history",
                attachTo: {
                    element: "#item-history",
                    on: "top-start"
                },
                text: `We keep track of the ${plural} you selected. <b>Click on a ${single}
                    from the history!</b>`
            },{
                id: "submit",
                attachTo: {
                    element: "#submit-btn",
                    on: "bottom"
                },
                canClickTarget: false,
                scrollToHandler: function() {
                    window.scrollTo(0, 0, { behavior: 'smooth' })
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `When you are happy with your list of similar ${plural}, click
                    this button to go to the next step.`
            },{
                id: "show-tutorial",
                attachTo: {
                    element: "#start-tutorial",
                    on: "left"
                },
                canClickTarget: false,
                scrollToHandler: function() {
                    window.scrollTo(0, 0, { behavior: 'smooth' })
                },
                buttons: [{ text: "okay", action: tutorialClear, classes: "bg-primary" }],
                text: `To start the tutorial again, click on this question mark.
                    This will <b>reset</b> your selection, so keep that in mind!`
            }
        ])
    }
    function getFirst(list) {
        const len = list.length
        return len > 0 ? list[0] : null
    }
    function getLast(list) {
        const len = list.length
        return len > 0 ? list[len-1] : null
    }

    function startTutorial() {
        setClusterIndex(0)
        clearSelection()
        // emit event so that things like timers can be cancelled
        emit("tutorial-start")
        tutorial.start()
        logAction({ desc: "start tutorial" }, true)
    }

   function onEndTutorial() {
        // emit event so that things like timers can be started again
        emit("tutorial-complete")
        logAction({ desc: "complete tutorial" }, true)
    }

    function onCancelTutorial() {
        // emit event so that things like timers can be started again
        emit("tutorial-cancel")
        logAction({ desc: "cancel tutorial" }, true)
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
            if (allItems.length === 0) {
                return console.debug("no items")
            }

            clusters = getItemClusters(allItems, props.target ? [props.target] : [])

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
        const lookAhead = Math.max(props.numClusters*2, Math.floor(k*0.25))

        while (clusterLeft.size > 0) {

            // get indices of all clusters
            const cf = allCf.filter(i => clusterLeft.has(i))

            if (cf.length === 0) {
                console.debug("no more clusters left")
                break
            }

            // get next clusters with the highest distances to each other
            const subset = cf.slice(0, lookAhead)
            const tmp = subset.map(i => {
                const scores = subset.map((d, j) => i === j ? 0 : clusters.minDistances[d][i])
                return {
                    index: i,
                    value: d3.mean(scores),
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
        if (!tutorial.isActive()) {
            logAction({
                desc: "candidates",
                items: candidates.value.slice(0)
            })
        }
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

        if (tutorial.isActive() && source !== "tutorial") {
            const sid = tutorial.getCurrentStep()
            if (sid.id === 'click-item' || sid.id === 'show-collected' ||
                sid.id === 'remove-item' || sid.id === 'show-history') {
                tutorialNeedsNext = true
            }
        }

        // move the item to another position
        if (move) {
            sounds.play(SOUND.PLOP)
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
                index: allItems.findIndex(d => d.id === id)
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
        sounds.play(SOUND.PLOP)
        // add the cluster to the list of selected clusters
        clsOrder.selected.add(object.cluster)
        // set the selected item
        selection.value[index] = object

        logAction({
            desc: "add item",
            source: source,
            item: object.id,
            selection: selection.value.filter(d => d !== null).map(d => d.id)
        })
        app.addInteraction("step1")

        addToHistory(object.id)
        updateCandidates()
    }

    function removeSelection(index, source="") {
        if (selection.value[index]) {

            sounds.play(SOUND.PLOP)
            const itemId = selection.value[index].id
            const c = selection.value[index].cluster
            const numCls = selectionItems.value.reduce((acc, d) => acc + (d.cluster === c ? 1 : 0), 0)
            // remove cluster highlight (if this was the only related item)
            if (numCls === 1) {
                clsOrder.selected.delete(selection.value[index].cluster)
            }
            selection.value[index] = null

            logAction({
                desc: "remove item",
                source: source,
                item: itemId,
                selection: selection.value.filter(d => d !== null).map(d => d.id)
            })
            app.addInteraction("step1")

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

            sounds.play(SOUND.PLOP)
            const prevId = selection.value[index].id
            const c = selection.value[index].cluster
            const numCls = selectionItems.value.reduce((acc, d) => acc + (d.cluster === c ? 1 : 0), 0)
            // remove cluster highlight (if this was the only related item)
            if (numCls === 1) {
                clsOrder.selected.delete(selection.value[index].cluster)
            }
            selection.value[index] = replacement
            clsOrder.selected.add(replacement.cluster)
            addToHistory(replacement.id)

            logAction({
                desc: "replace item",
                source: source,
                item: replacement.id,
                previous: prevId,
                selection: selection.value.filter(d => d !== null).map(d => d.id)
            })
            app.addInteraction("step1")

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

        allItems = DM.getDataBy("items", d => d.allTags.length > 0)
        allItems.sort((a, b) => a.id - b.id)
        allItems.forEach((d, i) => d._cidx = i)
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

    function logAction(obj, force=false) {
        if (!tutorial.isActive() || force) {
            obj.timestamp = Date.now()
            log.push(obj)
        }
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