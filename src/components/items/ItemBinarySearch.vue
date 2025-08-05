<template>
    <div style="width: min-content;" class="pa-2">
        <div id="question-container">
            <div v-if="inLastStep">
                <div style="text-align: center;">this would be your final set of {{ app.itemName }}s</div>
                <v-sheet v-if="inLastStep" rounded="lg" border class="pa-2 d-flex flex-wrap justify-center" style="max-width: 100%; width: 100%;">
                    <ItemTeaser v-for="id in finalItems"
                        :id="id"
                        class="mr-2 mb-2"
                        :width="imageWidth"
                        :height="imageHeight"
                        prevent-click
                        prevent-context/>
                </v-sheet>
            </div>

            <div v-for="(obj, idx) in split" :key="obj.tag" class="binsearch-q">

                <div style="text-align: center;" class="qtext">
                    <div v-if="idx === 0 && !inLastStep" style="font-size: large;">
                        Find the most similar {{ app.itemName }}s to your target!
                    </div>

                    <div class="mt-4 mb-2 d-flex align-center justify-space-around">
                        <div id="prev-btn" v-if="idx === 0 && hasPrevTag" class="d-flex">

                            <v-tooltip :text="tagList[tagIndex-1].longName" open-delay="300" location="top">
                                <template v-slot:activator="{ props }">
                                    <div v-bind="props"
                                        @click="prevTag"
                                        class="text-dots mr-2 cursor-pointer"
                                        style="opacity: 0.5; max-width: 150px;">
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
                        <div v-else style="min-width: 100px;"></div>

                        <h4 class="tag-name">{{ obj.tag.longName }}</h4>

                        <div id="next-btn" v-if="idx === 0 && hasNextTag" class="d-flex">
                            <v-btn
                                variant="outlined"
                                icon="mdi-arrow-right"
                                size="small"
                                density="comfortable"
                                @click="nextTag"/>

                            <v-tooltip :text="tagList[tagIndex+1].longName" open-delay="300" location="top">
                                <template v-slot:activator="{ props }">
                                    <div v-bind="props"
                                        @click="nextTag"
                                        class="text-dots ml-2 cursor-pointer"
                                        style="opacity: 0.5; max-width: 150px;">
                                        {{ tagList[tagIndex+1].longName }}
                                    </div>
                                </template>
                            </v-tooltip>
                        </div>
                        <div v-else style="min-width: 100px;"></div>

                    </div>

                    <p>{{ obj.tag.description }}</p>
                </div>

                <div class="d-flex mt-8 item-groups">

                    <div class="d-flex align-center pa-1 rounded" :style="{ border: '2px solid '+answerColor(true, obj.hasTag) }">
                        <div class="mr-1 d-flex flex-wrap item-examples-yes" :style="{ minWidth: ((obj.width+5)*2)+'px', maxHeight: (obj.size+10)+'px' }">
                            <ItemTeaser v-for="exId in obj.examplesYes"
                                :id="exId"
                                :width="obj.width"
                                :height="obj.height"
                                prevent-click
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
                                :highlights="obj.examplesYes"
                                :highlights-color="theme.current.value.colors.secondary"
                                @hover="onHover"
                                :selectable="false"
                                :selected="target ? [target] : []"
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
                                :highlights-color="theme.current.value.colors.secondary"
                                @hover="onHover"
                                :selectable="false"
                                :selected="target ? [target] : []"
                                :data="obj.without.map(idx => itemsToUse[idx])"/>
                        </div>
                        <div class="ml-1 d-flex flex-wrap item-examples-no" :style="{ minWidth: ((obj.width+5)*2)+'px', maxHeight: (obj.size+10)+'px' }">
                            <ItemTeaser v-for="exId in obj.examplesNo"
                                :id="exId"
                                :width="obj.width"
                                :height="obj.height"
                                prevent-click
                                prevent-context
                                class="mb-1 mr-1"/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import * as d3 from 'd3'
    import { ref, onMounted, onBeforeUnmount, onUpdated, computed } from 'vue';
    import DM from '@/use/data-manager';
    import { useApp } from '@/stores/app';
    import { GR_COLOR } from '@/stores/games';
    import { randomChoice } from '@/use/random';
    import { capitalize, mediaPath } from '@/use/utility';
    import { useTooltip } from '@/stores/tooltip';
    import SpiralBubble from '../vis/SpiralBubble.vue';
    import ItemTeaser from './ItemTeaser.vue';
    import { useShepherd } from 'vue-shepherd'
    import { useTheme } from 'vuetify';
    import { getItemClusters } from '@/use/clustering';
    import { offset } from '@floating-ui/vue';
    import { SOUND, useSounds } from '@/stores/sounds';

    const app = useApp()
    const tt = useTooltip()
    const theme = useTheme()
    const sounds = useSounds()

    let tutorialNeedsNext = false
    const tutorial = useShepherd({
        useModalOverlay: true,
        keyboardNavigation: false,
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
        maxItems:{
            type: Number,
            default: 30
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

    const finalItems = ref([])
    const inLastStep = computed(() => finalItems.value.length > 0)

    let log = []
    let itemsToUse, tagsToUse
    const itemsLeft = new Set()
    const tagsLeft = new Set()


    let allClusters

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
                    If you are not done by the time it ends, the page automatically goes to the
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
                    <b>other similar ${plural}</b> from our dataset by answering a few questions.`
            },{
                id: "show-question",
                attachTo: {
                    element: ".binsearch-q",
                    on: "bottom"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `Each questions splits the remaining ${plural} in <b>half</b> based on a specific tag.
                    You have to decide which group (left or right) makes for a <b>better fit</b>,
                    i.e. which is more similar to your target.`
            },{
                id: "show-text",
                attachTo: {
                    element: () => getLast(document.querySelectorAll(".qtext")),
                    on: "bottom"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `Each question asks you about a specific <b>tag</b>, providing the tag name and description.`
            },{
                id: "show-examples",
                attachTo: {
                    element: ".item-examples-yes",
                    on: "top"
                },
                extraHighlights: [".item-examples-no"],
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `On the sides, you can see a limited number of ${plural} from each group.`
            },{
                id: "click-yes",
                attachTo: {
                    element: () => getLast(document.querySelectorAll(".answer-yes")),
                    on: "bottom"
                },
                text: "Let's proceed by answering <b>yes</b>!"
            },{
                id: "next-tag",
                attachTo: {
                    element: "#next-btn",
                    on: "bottom"
                },
                extraHighlights: [".binsearch-q:first-child .tag-name"],
                text: `If the current question tag is not a good fit, it's better to look for a
                    different tag using the arrow buttons. Select the next tag by clicking on
                    this button!`
            },{
                id: "prev-tag",
                attachTo: {
                    element: "#prev-btn",
                    on: "bottom"
                },
                extraHighlights: [".binsearch-q:first-child .tag-name"],
                text: `Now you have a different tag and the grouping of ${plural} has changed.
                    To go back to the previous tag, simply click this button. Try it now!`
            },{
                id: "click-no",
                attachTo: {
                    element: () => getLast(document.querySelectorAll(".answer-no")),
                    on: "top"
                },
                text: `You can change a previous answer by clicking on a different answer button.
                    Change your answer to <b>no</b>!`
            },{
                id: "submit",
                attachTo: {
                    element: "#submit-btn",
                    on: "bottom"
                },
                scrollToHandler: function() {
                    window.scrollTo(0, 0, { behavior: 'smooth' })
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `When you have answered enough questions to narrow your selection to
                    ${props.minItems} ${plural}, you will see a <b>preview</b> of your selection
                    at the top of the page.
                    <span style="min-height: 1em"></span>
                    If you think the ${plural} fit, use this button to go to the next step.`
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
                text: "To start the tutorial again, click on this question mark."
            }
        ])
    }

    function getLast(list) {
        const len = list.length
        return len > 0 ? list[len-1] : null
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
        tagsToUse.forEach(t => {
            if (!app.excludedTags.has(t.name)) {
                tagsLeft.add(t.id)
            }
        })

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

                const clustersYes = []
                const clustersNo = []
                allClusters = []
                const maxnum = Math.max(c1.clusters.length, c2.clusters.length)
                for (let i = 0; i < maxnum; ++i) {
                    if (i < c1.clusters.length) {
                        clustersYes.push(c1.clusters[i].map(dd => itemsToUse.findIndex(d => d.id === dd.id)))
                        allClusters.push(clustersYes.at(-1))
                    }
                    if (i < c2.clusters.length) {
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
            last.examplesYes = examplesYes.map(idx => itemsToUse[idx].id)
            last.examplesNo = examplesNo.map(idx => itemsToUse[idx].id)

            logAction({
                desc: desc,
                step: split.value.length,
                tag: splitTag,
                with: withTag,
                without: without
            })

            last.tag = splitTag
            tagsLeft.delete(last.tag.id)
        }
    }
    function prevTag() {
        if (hasPrevTag.value) {
            tagIndex.value--
            app.addInteraction("step1")

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
        // remove
        if (!inLastStep.value && split.value.length > 0) {
            const last = split.value.at(0)
            const choice = last.tag.id
            const indices = Array.from(itemsLeft.values())
            indices.forEach(idx => {
                const hasTag = itemsToUse[idx].allTags.find(t => t.id === choice) !== undefined
                if (hasTag !== last.hasTag) {
                    itemsLeft.delete(idx)
                }
            })
        }

        // we should not split again
        if (itemsLeft.size <= props.minItems) {
            const last = split.value.at(0)

            finalItems.value = last.hasTag ?
                last.with.map(idx => itemsToUse[idx].id) :
                last.without.map(idx => itemsToUse[idx].id)

            emit("ready", true)
            return
        }

        // calculate tag frequencies
        const counts = new Map()
        itemsLeft.forEach(idx => {
            itemsToUse[idx].allTags.forEach(t => {
                if (!tagsLeft.has(t.id)) return
                counts.set(t.id, (counts.get(t.id) || 0) + 1)
            })
        })
        tagsToUse.forEach(t => {
            if (counts.has(t.id)) {
                t.freq.push(counts.get(t.id) / itemsLeft.size)
            } else {
                t.freq.push(0)
            }
        })

        // sort tags by difference to 50%
        tagsToUse.sort((a, b) => Math.abs(0.5 - a.freq.at(-1)) - Math.abs(0.5 - b.freq.at(-1)))

        tagIndex.value = 0
        tagList.value = tagsToUse
        // choose first tag as the one to split on
        const splitTag = tagsToUse[0]

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

            const clustersYes = []
            const clustersNo = []
            allClusters = []
            const maxnum = Math.max(c1.clusters.length, c2.clusters.length)
            for (let i = 0; i < maxnum; ++i) {
                if (i < c1.clusters.length) {
                    clustersYes.push(c1.clusters[i].map(dd => itemsToUse.findIndex(d => d.id === dd.id)))
                    allClusters.push(clustersYes.at(-1))
                }
                if (i < c2.clusters.length) {
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
            tag: splitTag,
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
            tag: splitTag.id,
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
            tag: it.tag.id,
            removeCount: index
        })
        app.addInteraction("step1")

        // remove following tags if we clicked on a previous tag
        if (index > 0) {
            // add items back to list of available items
            for (let i = 1; i <= index; ++i) {
                const s = split.value.at(i)
                s.with.forEach(id => itemsLeft.add(id))
                s.without.forEach(id => itemsLeft.add(id))
            }
            // remove splits
            split.value.splice(0, index)
        }

        if (inLastStep.value) {
            finalItems.value = []
            emit("ready", false)
        }

        splitItems()

        if (tutorial.isActive()) {
            const sid = tutorial.getCurrentStep()
            if (sid.id === "click-yes" || sid.id === "click-no") {
                tutorialNeedsNext = true
            }
        }
    }

    function logAction(obj) {
        if (!tutorial.isActive()) {
            obj.timestamp = Date.now()
            log.push(obj)
        }
    }

    function read() {
        itemsToUse = DM.getDataBy("items", d => d.allTags.length > 0 && (!props.target || d.id !== props.target))
        const tags = DM.getData("tags", false)
        tagsToUse = tags
            .filter(d => d.is_leaf === 1)
            .map(d => {
                const obj = Object.assign({}, d)
                obj.freq = []
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
        itemsToUse.forEach((_, idx) => itemsLeft.add(idx))
        tagsToUse.forEach(t => {
            if (!app.excludedTags.has(t.name)) {
                tagsLeft.add(t.id)
            }
        })
        if (update) {
            splitItems()
        }
    }

    function getSubmitData() {
        const indices = itemsLeft.size <= props.maxItems ?
            Array.from(itemsLeft.values()) :
            randomChoice(Array.from(itemsLeft.values()), props.maxItems)

        return {
            candidates: indices.map(idx => itemsToUse[idx]),
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