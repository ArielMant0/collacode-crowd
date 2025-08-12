<template>
    <div id="act-binsearch" style="width: min-content;" class="pa-2">

        <div id="question-container">
            <div id="final-selection">
                <div style="text-align: center;" class="text-caption">this would be your final set of {{ app.itemName }}s</div>
                <v-sheet rounded="lg" border class="pa-2 mb-2 d-flex flex-wrap justify-center"
                    :style="{ minHeight: ((imageHeight+10))+'px' }"
                    style="max-width: 100%; width: 100%; border: 2px dashed black">
                    <ItemTeaser v-for="item in finalItems"
                        :item="item"
                        class="mr-2 mb-2"
                        :width="imageWidth"
                        :height="imageHeight"
                        prevent-click
                        prevent-context/>
                </v-sheet>
            </div>

            <div>
                <div v-for="(obj, idx) in split" :key="obj.key" class="binsearch-q">

                    <div style="text-align: center;" class="qtext">

                        <div v-if="idx === 0" style="font-size: large;">
                            Find the most similar {{ app.itemName }}s to your target!
                        </div>

                        <div class="mt-4 mb-2 d-flex align-center justify-space-between" style="min-width: 70%;">

                            <div id="prev-btn" v-if="idx === 0 && hasPrevTag" class="d-flex">

                                <v-tooltip :text="tagList[tagIndex-1].longName" open-delay="100" location="top">
                                    <template v-slot:activator="{ props }">
                                        <div v-bind="props"
                                            @click="prevTag"
                                            class="text-dots mr-2 cursor-pointer"
                                            style="opacity: 0.5; min-width: 150px; max-width: 150px; text-align: right;">
                                            {{ tagList[tagIndex-1].longName }}
                                        </div>
                                    </template>
                                </v-tooltip>

                                <v-btn
                                    variant="outlined"
                                    icon="mdi-arrow-left"
                                    size="small"
                                    density="comfortable"
                                    @click="prevTag"/>
                            </div>
                            <div v-else style="min-width: 186px;"></div>

                            <h4 class="tag-name">{{ obj.tag.longName }}</h4>

                            <div id="next-btn" v-if="idx === 0 && hasNextTag" class="d-flex">
                                <v-btn
                                    variant="outlined"
                                    icon="mdi-arrow-right"
                                    size="small"
                                    density="comfortable"
                                    @click="nextTag"/>

                                <v-tooltip :text="tagList[tagIndex+1].longName" open-delay="100" location="top">
                                    <template v-slot:activator="{ props }">
                                        <div v-bind="props"
                                            @click="nextTag"
                                            class="text-dots ml-2 cursor-pointer"
                                            style="opacity: 0.5; min-width: 150px; max-width: 150px; text-align: left;">
                                            {{ tagList[tagIndex+1].longName }}
                                        </div>
                                    </template>
                                </v-tooltip>
                            </div>
                            <div v-else style="min-width: 186px;"></div>

                        </div>

                        <p style="max-width: 100%;">{{ obj.tag.description }}</p>
                    </div>

                    <div class="d-flex mt-8 item-groups">

                        <div class="d-flex align-center pa-1 rounded" :style="{ border: '2px solid '+answerColor(true, obj.hasTag) }">
                            <div class="mr-1 d-flex flex-wrap item-examples-yes" :style="{ minWidth: ((obj.width+5)*2)+'px', maxHeight: (obj.size+10)+'px' }">
                                <ItemTeaser v-for="exId in obj.examplesYes"
                                    :id="exId"
                                    :width="obj.width"
                                    :height="obj.height"
                                    @click="toggleInventory(exId)"
                                    :border-size="2"
                                    :border-color="inventoryColors[exId] ? inventoryColors[exId] : 'white'"
                                    prevent-open
                                    prevent-context
                                    class="mb-1 ml-1"/>
                            </div>
                            <div class="d-flex flex-column align-center answer-yes" :style="{ minWidth: '300px' }">
                                <v-btn
                                    class="yes-btn"
                                    density="comfortable"
                                    :color="GR_COLOR.GREEN"
                                    @click="choose(true, idx)">yes</v-btn>
                                <SpiralBubble
                                    class="items-yes"
                                    :width="obj.size"
                                    :height="obj.size"
                                    color="lightgrey"
                                    highlights-color="grey"
                                    :highlights="obj.examplesYes"
                                    :data-colors="inventoryColors"
                                    @hover="onHover"
                                    @click="d => toggleInventory(d.id)"
                                    :data="obj.with.map(idx => itemsToUse[idx])"/>
                            </div>
                        </div>

                        <div class="d-flex align-center pa-2 rounded" :style="{ border: '2px solid '+answerColor(false, obj.hasTag) }">
                            <div class="d-flex flex-column align-center answer-no" :style="{ minWidth: '300px' }">
                                <v-btn
                                    class="no-btn"
                                    density="comfortable"
                                    :color="GR_COLOR.RED"
                                    @click="choose(false, idx)">no</v-btn>
                                <SpiralBubble
                                    class="items-no"
                                    :width="obj.size"
                                    :height="obj.size"
                                    :highlights="obj.examplesNo"
                                    color="lightgrey"
                                    highlights-color="grey"
                                    :data-colors="inventoryColors"
                                    @hover="onHover"
                                    @click="d => toggleInventory(d.id)"
                                    :data="obj.without.map(idx => itemsToUse[idx])"/>
                            </div>
                            <div class="ml-1 d-flex flex-wrap item-examples-no" :style="{ minWidth: ((obj.width+5)*2)+'px', maxHeight: (obj.size+10)+'px' }">
                                <ItemTeaser v-for="exId in obj.examplesNo"
                                    :id="exId"
                                    :width="obj.width"
                                    :height="obj.height"
                                    @click="toggleInventory(exId)"
                                    :border-size="2"
                                    :border-color="inventoryColors[exId] ? inventoryColors[exId] : 'white'"
                                    prevent-open
                                    prevent-context
                                    class="mb-1 mr-1"/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="text-caption ml-8 pa-1 inventory"
                :style="{ minWidth: (imageWidth+20)+'px', maxWidth: (imageWidth+30)+'px' }">
                <div style="text-align: center;">stored {{ app.itemName }}s</div>
                <div
                    class="rounded-lg pa-2"
                    style="max-height: 80vh; overflow-y: auto; overflow-x: hidden; min-height: 100px; border: 2px dashed black;">
                    <ItemTeaser v-for="exId in inventory"
                        :id="exId"
                        :width="imageWidth"
                        :height="imageHeight"
                        @click="toggleInventory(exId)"
                        :border-size="3"
                        :border-color="inventoryColors[exId]"
                        prevent-open
                        prevent-context
                        class="mb-1"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, onBeforeUnmount, onUpdated, computed, reactive } from 'vue';
    import DM from '@/use/data-manager';
    import { useApp } from '@/stores/app';
    import { GR_COLOR } from '@/stores/games';
    import { randomChoice, randomShuffle } from '@/use/random';
    import { useTooltip } from '@/stores/tooltip';
    import SpiralBubble from '../vis/SpiralBubble.vue';
    import ItemTeaser from './ItemTeaser.vue';
    import { useShepherd } from 'vue-shepherd'
    import { useTheme } from 'vuetify';
    import { getItemClusters } from '@/use/clustering';
    import { offset } from '@floating-ui/vue';
    import { SOUND, useSounds } from '@/stores/sounds';
    import { useToast } from 'vue-toastification';
    import { schemeCategory10 } from 'd3';

    const app = useApp()
    const tt = useTooltip()
    const theme = useTheme()
    const sounds = useSounds()
    const toast = useToast()

    let tutorialNeedsNext = false
    const tutorial = useShepherd({
        useModalOverlay: true,
        keyboardNavigation: false,
        exitOnEsc: false,
        defaultStepOptions: {
            classes: 'shadow-md bg-surface-light arrow-primary',
            scrollTo: { behavior: 'smooth', block: 'start' },
            modalOverlayOpeningPadding: 10,
            modalOverlayOpeningRadius: 8,
            floatingUIOptions: { middleware: [offset(25)] }
        }
    })
    tutorial.on("complete", onEndTutorial)
    tutorial.on("cancel", onCancelTutorial)

    const props = defineProps({
        imageWidth: {
            type: Number,
            default: 120
        },
        imageHeight: {
            type: Number,
            default: 60
        },
        minItems: {
            type: Number,
            default: 10
        },
        maxItems: {
            type: Number,
            default: 30
        },
        maxInventory: {
            type: Number,
            default: 5
        },
        nodeSize: {
            type: Number
        },
        target: {
            type: Number,
        },
        numExamples: {
            type: Number,
            default: 5
        },
    })

    const emit = defineEmits(["ready", "tutorial-start", "tutorial-complete", "tutorial-cancel"])

    const split = ref([])

    const tagList = ref([])
    const tagIndex = ref(0)
    const hasPrevTag = computed(() => tagIndex.value > 0)
    const hasNextTag = computed(() => tagIndex.value < tagList.value.length-1)
    const selectedTag = computed(() => tagList.value[tagIndex.value])

    const inventory = reactive(new Set())
    const inventoryColors = computed(() => {
        const obj = {}
        const vals = Array.from(inventory.values())
        vals.forEach((id, i) => obj[id] = schemeCategory10[i % schemeCategory10.length])
        return obj
    })

    const finalItems = ref([])

    let log = []
    let allClusters
    let itemsToUse, tagsToUse

    const itemsLeft = reactive(new Set())
    const tagsLeft = new Set()


    function getImageHeight(n, m) {
        const bs = getBubbleSize(n, m)
        return Math.max(50, Math.min(160, Math.round(bs / 40)))
    }

    function getBubbleSize(n, m) {
        const s = Math.max(n, m)
        return Math.max(100, Math.min(Math.round(Math.sqrt(s) * 25), 300))
    }

    function onHover(d, event) {
        if (d === null) {
            tt.hide()
        } else {
            tt.showItem(event, d)
        }
    }

    function answerColor(answer, hasTag) {
        if (hasTag !== null && answer === hasTag) {
            return answer ? GR_COLOR.GREEN : GR_COLOR.RED
        }
        return theme.current.value.colors.background
    }


    function toggleInventory(id) {
        let action = ""
        if (inventory.has(id)) {
            action = "remove"
            inventory.delete(id)
        } else {
            action = "add"
            if (inventory.size >= props.maxInventory) {
                toast.warning(`max ${props.maxInventory} ${app.itemName}s can be highlighted`)
            } else {
                inventory.add(id)
            }
        }

        updateFinalItems(getCandidates())
        if (tutorial.isActive()) {
            const sid = tutorial.getCurrentStep()
            if (sid.id === "inv-add" && action === "add" && inventory.size >= 2 ||
                sid.id === "inv-remove" && action === "remove"
            ) {
                tutorialNeedsNext = true
            }
        } else {
            logAction({
                desc: "inventory",
                action: action,
                item: id,
                inventory: Array.from(inventory.values())
            })
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
                    If you are not done by the time it ends, the page <b>automatically</b> goes to the
                    next step with your current results.`
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
                id: "show-question",
                attachTo: {
                    element: ".binsearch-q",
                    on: "top"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `Each step <b>splits</b> the remaining ${plural} based on a specific tag.
                    You have to decide which group (left or right) makes for a <b>better fit</b>,
                    i.e. which group is more similar to your target.`
            },{
                id: "show-text",
                attachTo: {
                    element: () => getLast(document.querySelectorAll(".qtext")),
                    on: "bottom"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `Each step asks you about a specific <b>tag</b>, providing the tag name and description.`
            },{
                id: "show-examples",
                attachTo: {
                    element: ".item-examples-yes",
                    on: "top"
                },
                extraHighlights: [".item-examples-no"],
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `On the sides, you can see a <b>limited</b> number of ${plural} from each group.`
            },{
                id: "hover-dots",
                attachTo: {
                    element: ".binsearch-q",
                    on: "top"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `You can inspect the ${plural} in the spiral by hovering over a dot.
                    <div style="min-height: 1em"></div>
                    <span style="text-decoration: underline">Hint:</span>
                    The dots are <b>sorted by similarity</b>, so you find similar ${plural}
                    by looking at <b>neighboring dots</b>!`
            },{
                id: "click-yes",
                attachTo: {
                    element: () => getLast(document.querySelectorAll(".answer-yes")),
                    on: "bottom"
                },
                text: "<b>Let's answer yes!</b>"
            },{
                id: "next-tag",
                attachTo: {
                    element: "#next-btn",
                    on: "bottom"
                },
                extraHighlights: [
                    ".binsearch-q:first-child .tag-name",
                    ".binsearch-q:first-child .item-groups"
                ],
                text: `If the current tag is <b>not a good fit</b>, it's better to look
                    for a different one using the arrow buttons. <b>Select the next tag</b> by
                    clicking on the <b>right arrow</b> button!`
            },{
                id: "prev-tag",
                attachTo: {
                    element: "#prev-btn",
                    on: "bottom"
                },
                extraHighlights: [
                    ".binsearch-q:first-child .tag-name",
                    ".binsearch-q:first-child .item-groups"
                ],
                text: `Now you have a different tag and the groups of ${plural} has changed.
                    To <b>go back</b> to the previous tag, click the <b>left arrow</b> button.
                    <b>Try it now!</b>`
            },{
                id: "click-no",
                attachTo: {
                    element: () => getLast(document.querySelectorAll(".answer-no")),
                    on: "top"
                },
                text: `You can change a previous answer by clicking on a different answer button.
                    <b>Change your answer to no!</b>`
            },{
                id: "show-inv",
                attachTo: { element: ".inventory", on: "left" },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `You can store up to ${props.maxInventory} ${plural} which lets you keep
                    track of which side they are on for all steps.
                    <div style="min-height: 1em"></div>
                    When you store more than 1 ${single}, the next suggested tags will try
                    to keep your stored ${plural} together.
                    <div style="min-height: 1em"></div>
                    All of these ${plural} will also be part of your <b>final selection</b>.`
            },{
                id: "inv-add",
                attachTo: {
                    element: () => getFirst(document.querySelectorAll(".item-groups")),
                    on: "bottom"
                },
                text: `Click on <b>two different</b> ${app.itemName} images or dots in the
                    spiral to <b>store</b> ${plural}!`
            },{
                id: "inv-explain",
                attachTo: {
                    element: () => getFirst(document.querySelectorAll(".item-groups")),
                    on: "bottom"
                },
                extraHighlights: [".inventory"],
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `Now your stored ${plural} are highlighted in every step, so you can
                    always see to which side they belong.`
            },{
                id: "inv-remove",
                attachTo: {
                    element: () => getFirst(document.querySelectorAll(".inventory .item-teaser")),
                    on: "left"
                },
                beforeShowPromise: async function() {
                    if (inventory.size === 0) {
                        const first = split.value.at(-1)
                        const id = randomChoice(first.with.map(i => itemsToUse[i].id), 1)
                        toggleInventory(id)
                    }
                },
                text: `<b>Click</b> on this ${app.itemName} to <b>remove</b> the ${single}
                    from the store.`
            },{
                id: "final-items",
                attachTo: { element: "#final-selection", on: "bottom" },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                scrollToHandler: function() {
                    window.scrollTo(0, 0, { behavior: 'smooth' })
                },
                text: `This is your <b>final set of ${plural}</b> you will refine in the next stage.
                    It contains your <b>stored games</b> and those from the <b>last step</b>, as
                    soon as you narrowed it down to about <b>${props.minItems}</b> ${plural}.`
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
                extraHighlights: ["#final-selection"],
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `If you think the ${plural} in your final selection <b>fit well</b>, use
                    this button to go to the next step. If they <b>don't fit well</b>, try
                    changing some of your answers.`
            },{
                id: "show-tutorial",
                attachTo: {
                    element: "#start-tutorial",
                    on: "left"
                },
                scrollToHandler: function() {
                    window.scrollTo(0, 0, { behavior: 'smooth' })
                },
                buttons: [{ text: "okay", action: tutorialClear, classes: "bg-primary" }],
                text: `To start the tutorial again, click on this question mark.
                    This will <b>reset</b> everything, so keep that in mind!`
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
        clearAnswers()
        inventory.clear()
        updateFinalItems([])
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
        inventory.clear()
        updateFinalItems([])
        clearAnswers()
    }

    function clearAnswers() {
        // add items back to list of available items
        for (let i = 0; i < split.value.length; ++i) {
            const s = split.value.at(i)
            s.with.forEach(id => itemsLeft.add(id))
            s.without.forEach(id => itemsLeft.add(id))
        }

        // reset available tags
        tagsToUse.forEach(t => tagsLeft.add(t.id))

        // clear splits
        split.value = []

        // get the next tag
        splitItems()
    }

    function getCluster(idx) {
        return allClusters.findIndex(list => list.includes(idx))
    }

    function goToTag(desc="go to other tag") {
        if (split.value.length > 0) {
            const last = split.value.at(0)
            const splitTag = selectedTag.value
            tagsLeft.add(last.tag.id)
            last.hasTag = null
            // add items back in again
            last.with.forEach(i => itemsLeft.add(i))
            last.without.forEach(i => itemsLeft.add(i))
            // split items by with out without again
            const withTag = [], without = []
            itemsLeft.forEach(idx => {
                const has = itemsToUse[idx].allTags.find(t => t.id === splitTag.id)
                if (has) {
                    withTag.push(idx)
                } else {
                    without.push(idx)
                }
            })

            let examplesYes = [], examplesNo = []
            // redo the clustering
            if (split.value.length === 1) {
                const c1 = getItemClusters(withTag.map(idx => itemsToUse[idx]))
                const c2 = getItemClusters(without.map(idx => itemsToUse[idx]))

                const clustersYes = c1 ? [] : withTag.map(idx => [idx])
                const clustersNo = c2 ? [] : without.map(idx => [idx])
                allClusters = []
                const maxnum = Math.max(
                    c1 ? c1.clusters.length : 0,
                    c2 ? c2.clusters.length : 0
                )
                for (let i = 0; i < maxnum; ++i) {
                    if (c1 && i < c1.clusters.length) {
                        clustersYes.push(c1.clusters[i].map(dd => itemsToUse.findIndex(d => d.id === dd.id)))
                        allClusters.push(clustersYes.at(-1))
                    }
                    if (c2 && i < c2.clusters.length) {
                        clustersNo.push(c2.clusters[i].map(dd => itemsToUse.findIndex(d => d.id === dd.id)))
                        allClusters.push(clustersNo.at(-1))
                    }

                }
                examplesYes = clustersYes.slice(0, props.numExamples*2).map(list => list[0])
                examplesNo = clustersNo.slice(0, props.numExamples*2).map(list => list[0])
            } else {
                const numEx = Math.max(last.examplesYes.length, last.examplesNo.length)
                const clsYes = new Set()
                const used = new Set()
                for (let i = 0; i < withTag.length && i < numEx; ++i) {
                    const cidx = getCluster(withTag[i])
                    if (cidx >= 0 && !clsYes.has(cidx)) {
                        examplesYes.push(withTag[i])
                        clsYes.add(cidx)
                        used.add(withTag[i])
                    }
                }
                // add items from already used clusters if there are too few clusters
                if (examplesYes.length < numEx && withTag.length >= examplesYes.length) {
                    examplesYes = examplesYes.concat(randomChoice(
                        withTag.filter(idx => !used.has(idx)),
                        Math.min(numEx - examplesYes.length, withTag.length - examplesYes.length)
                    ))
                }

                const clsNo = new Set()
                for (let i = 0; i < without.length && i < numEx; ++i) {
                    const cidx = getCluster(without[i])
                    if (cidx >= 0 && !clsNo.has(cidx)) {
                        examplesNo.push(without[i])
                        clsNo.add(cidx)
                        used.add(without[i])
                    }
                }

                // add items from already used clusters if there are too few clusters
                if (examplesNo.length < numEx && without.length >= examplesNo.length) {
                    examplesNo = examplesNo.concat(randomChoice(
                        without.filter(idx => !used.has(idx)),
                        Math.min(numEx - examplesNo.length, without.length - examplesNo.length)
                    ))
                }
            }

            withTag.sort((a, b) => getCluster(b) - getCluster(a))
            without.sort((a, b) => getCluster(b) - getCluster(a))

            last.with = withTag
            last.without = without
            last.hasTag = null
            last.examplesYes = examplesYes.map(idx => itemsToUse[idx].id)
            last.examplesNo = examplesNo.map(idx => itemsToUse[idx].id)

            logAction({
                desc: desc,
                step: split.value.length,
                tag: { id: splitTag.id, name: splitTag.name },
                with: withTag,
                without: without
            })

            last.tag = splitTag
            last.tagIndex = tagIndex.value

            updateFinalItems(getCandidates())
        }
    }
    function prevTag() {
        if (hasPrevTag.value) {
            tagIndex.value--
            app.addInteraction("step1")

            sounds.play(SOUND.CLICK)
            if (tutorial.isActive()) {
                const sid = tutorial.getCurrentStep()
                if (sid.id === "prev-tag") {
                    tutorialNeedsNext = true
                }
            }

            goToTag("previous tag")
        }
    }
    function nextTag() {
        if (hasNextTag.value) {
            tagIndex.value++
            app.addInteraction("step1")

            sounds.play(SOUND.CLICK)
            if (tutorial.isActive()) {
                const sid = tutorial.getCurrentStep()
                if (sid.id === "next-tag") {
                    tutorialNeedsNext = true
                }
            }
            goToTag("next tag")
        }
    }

    async function splitItems() {

        // we should not split again
        if (itemsLeft.size <= props.minItems) {
            return updateFinalItems(getCandidates())
        }

        // calculate tag frequencies
        const counts = new Map()
        const invCount = {}

        itemsLeft.forEach(idx => {
            const inInv = inventory.has(itemsToUse[idx].id)
            itemsToUse[idx].allTags.forEach(t => {
                if (!tagsLeft.has(t.id)) return
                counts.set(t.id, (counts.get(t.id) || 0) + 1)
                if (inInv) {
                    if (invCount[t.id]) {
                        invCount[t.id].add(itemsToUse[idx].id)
                    } else{
                        invCount[t.id] = new Set([itemsToUse[idx].id])
                    }
                }
            })
        })

        tagsToUse.forEach(t => {
            const c = counts.get(t.id)
            if (c !== undefined && c > 1 && c < itemsLeft.size-1) {
                t.freq = c / itemsLeft.size
                t.count = c
                if (invCount[t.id]) {
                    const ic = invCount[t.id].size
                    t.maxInv = Math.max(inventory.size-ic, ic)
                } else {
                    t.maxInv = inventory.size
                }
            } else {
                t.freq = 0
                t.count = 0
                t.maxInv = 0
            }
        })

        const tagCands = tagsToUse.filter(t => t.freq > 0)
        const bucketSize = 0.1

        tagCands.sort((a, b) => {
            const bucketA = Math.floor(Math.abs(0.5 - a.freq) / bucketSize)
            const bucketB = Math.floor(Math.abs(0.5 - b.freq) / bucketSize)
            // sort tags by max number of inventory items on 1 side
            if (inventory.size > 0 && bucketA === bucketB && a.maxInv !== b.maxInv) {
                return b.maxInv - a.maxInv
            }
            // sort tags by difference to 50%
            return Math.abs(0.5 - a.freq) - Math.abs(0.5 - b.freq)
        })

        tagIndex.value = 0
        tagList.value = tagCands

        // choose first tag as the one to split on
        const splitTag = tagCands[0]

        // divide items based on split tag
        const withTag = [], without = []
        itemsLeft.forEach(idx => {
            const has = itemsToUse[idx].allTags.find(t => t.id === splitTag.id)
            if (has) {
                withTag.push(idx)
            } else {
                without.push(idx)
            }
        })

        tagsLeft.delete(splitTag.id)

        let examplesYes = [], examplesNo = []
        // if we are doing this for the first time, cluster both sides
        if (split.value.length === 0) {
            const c1 = getItemClusters(withTag.map(idx => itemsToUse[idx]))
            const c2 = getItemClusters(without.map(idx => itemsToUse[idx]))

            const clustersYes = c1 ? [] : withTag.map(idx => [idx])
            const clustersNo = c2 ? [] : without.map(idx => [idx])
            allClusters = []
            const maxnum = Math.max(
                c1 ? c1.clusters.length : 0,
                c2 ? c2.clusters.length : 0
            )

            for (let i = 0; i < maxnum; ++i) {
                if (c1 && i < c1.clusters.length) {
                    clustersYes.push(c1.clusters[i].map(dd => itemsToUse.findIndex(d => d.id === dd.id)))
                    allClusters.push(clustersYes.at(-1))
                }
                if (c2 && i < c2.clusters.length) {
                    clustersNo.push(c2.clusters[i].map(dd => itemsToUse.findIndex(d => d.id === dd.id)))
                    allClusters.push(clustersNo.at(-1))
                }
            }

            examplesYes = clustersYes.slice(0, props.numExamples*2).map(list => list[0])
            examplesNo = clustersNo.slice(0, props.numExamples*2).map(list => list[0])

        } else {
            const numEx = Math.max(2, props.numExamples - split.value.length) * 2

            const clsYes = new Set()
            const used = new Set()
            for (let i = 0; i < withTag.length && i < numEx; ++i) {
                const cidx = getCluster(withTag[i])
                if (cidx >= 0 && !clsYes.has(cidx)) {
                    examplesYes.push(withTag[i])
                    clsYes.add(cidx)
                    used.add(withTag[i])
                }
            }
            // add items from already used clusters if there are too few clusters
            if (examplesYes.length < numEx && withTag.length >= examplesYes.length) {
                examplesYes = examplesYes.concat(randomChoice(
                    withTag.filter(idx => !used.has(idx)),
                    Math.min(numEx - examplesYes.length, withTag.length - examplesYes.length)
                ))
            }

            const clsNo = new Set()
            for (let i = 0; i < without.length && i < numEx; ++i) {
                const cidx = getCluster(without[i])
                if (cidx >= 0 && !clsNo.has(cidx)) {
                    examplesNo.push(without[i])
                    clsNo.add(cidx)
                    used.add(without[i])
                }
            }

            // add items from already used clusters if there are too few clusters
            if (examplesNo.length < numEx && without.length >= examplesNo.length) {
                examplesNo = examplesNo.concat(randomChoice(
                    without.filter(idx => !used.has(idx)),
                    Math.min(numEx - examplesNo.length, without.length - examplesNo.length)
                ))
            }
        }

        withTag.sort((a, b) => getCluster(b) - getCluster(a))
        without.sort((a, b) => getCluster(b) - getCluster(a))

        const h = getImageHeight(withTag.length, without.length)
        split.value.unshift({
            key: split.value.length,
            tag: splitTag,
            tagIndex: tagIndex.value,
            tagList: tagCands.map(t => t.id),
            hasTag: null,
            with: withTag,
            without: without,
            examplesYes: examplesYes.map(idx => itemsToUse[idx].id),
            examplesNo: examplesNo.map(idx => itemsToUse[idx].id),
            size: getBubbleSize(withTag.length, without.length),
            width: h*2,
            height: h
        })

        logAction({
            desc: "split step",
            step: split.value.length,
            tag: { id: splitTag.id, name: splitTag.name },
            with: withTag.map(i => itemsToUse[i].id),
            without: without.map(i => itemsToUse[i].id),
        })
    }

    function choose(hasTag, index) {
        if (split.value.length === 0) return
        sounds.play(SOUND.PLOP)

        const it = split.value.at(index)
        it.hasTag = hasTag === true
        logAction({
            desc: "choose answer",
            step: split.value.length-index-1,
            answer: it.hasTag ? "yes" : "no",
            tag: { id: it.tag.id, name: it.tag.name },
            removeCount: index
        })
        app.addInteraction("step1")

        // remove following tags if we clicked on a previous tag
        if (index > 0) {
            tagsLeft.add(split.value[0].tag.id)
            // add items and tags back to list of available items
            for (let i = 1; i <= index; ++i) {
                const s = split.value.at(i)
                s.with.forEach(id => itemsLeft.add(id))
                s.without.forEach(id => itemsLeft.add(id))
                if (i < index) {
                    tagsLeft.add(s.tag.id)
                }
            }

            // remove splits
            split.value.splice(0, index)
        }

        // remove items in the other group
        if (it.hasTag) {
            it.without.forEach(id => itemsLeft.delete(id))
            it.with.forEach(id => itemsLeft.add(id))
        } else {
            it.with.forEach(id => itemsLeft.delete(id))
            it.without.forEach(id => itemsLeft.add(id))
        }

        if (itemsLeft.size <= props.minItems) {
            updateFinalItems(getCandidates())
        }

        splitItems()

        if (index > 0) {
            const last = split.value.at(0)
            tagList.value = last.tagList.map(id => tagsToUse.find(t => t.id === id))
            tagIndex.value = last.tagIndex
        }

        if (tutorial.isActive()) {
            const sid = tutorial.getCurrentStep()
            if (sid.id === "click-yes" || sid.id === "click-no") {
                tutorialNeedsNext = true
            }
        }
    }

    function logAction(obj, force=false) {
        if (!tutorial.isActive() || force) {
            obj.timestamp = Date.now()
            log.push(obj)
        }
    }

    function read() {
        itemsToUse = DM.getDataBy("items", d => d.allTags.length > 0 && (!props.target || d.id !== props.target))
        itemsToUse.sort((a, b) => a.id - b.id)
        const tags = DM.getData("tags", false)
        tagsToUse = tags
            .filter(d => d.is_leaf === 1 && !app.excludedTags.has(d.name))
            .map(d => {
                const obj = Object.assign({}, d)
                obj.freq = 0
                return obj
            })
    }

    function reset(update=true) {
        log = []
        tutorialNeedsNext = false
        split.value = []
        finalItems.value = []
        itemsLeft.clear()
        tagsLeft.clear()
        inventory.clear()
        itemsToUse.forEach((_, idx) => itemsLeft.add(idx))
        tagsToUse.forEach(t => tagsLeft.add(t.id))
        if (update) {
            splitItems()
        }
    }

    function updateFinalItems(items) {
        finalItems.value = items
        emit("ready", finalItems.value.length > 0)
    }

    function getCandidates(force=false) {
        const invIds = Array.from(inventory.values())
        const cands = invIds.map(id => itemsToUse.find(d => d.id == id))

        if (!force && (split.value.length === 0 || itemsLeft.size > props.minItems)) {
            return cands
        }

        const last = split.value.at(0)
        if (last.hasTag !== null) {
            let list = last.hasTag ? last.with : last.without
            list.forEach(idx => {
                if (!inventory.has(itemsToUse[idx].id) && cands.length < props.maxItems) {
                    cands.push(itemsToUse[idx])
                }
            })
        } else {
            const tmp = randomShuffle(
                last.with.map(idx => itemsToUse[idx])
                .concat(last.without.map(idx => itemsToUse[idx]))
            )
            for (let i = 0; i < tmp.length && cands.length < props.maxItems; ++i) {
                if (!inventory.has(itemsToUse[tmp[i]].id)) {
                    cands.push(itemsToUse[tmp[i]])
                }
            }
        }

        if (!tutorial.isActive()) {
            logAction({
                desc: "candidates",
                items: cands.map(d => d.id)
            })
        }

        return cands
    }

    function getSubmitData() {
        if (finalItems.value.length === 0) {
            updateFinalItems(getCandidates(true))
        }
        return {
            candidates: finalItems.value,
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
        read()
        reset()
    })

</script>

<style scoped>
.inventory {
    position: fixed;
    top: 200px;
    right: 50px;
}
</style>