<template>
    <div style="width: min-content;" class="pa-2">
        <div>
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

            <div v-for="(obj, idx) in split" :key="obj.tag.id" class="binsearch-q">

                <div style="text-align: center;" class="qtext">
                    <div v-if="idx === 0 && !inLastStep" style="font-size: large;">
                        Which side is the better fit?
                    </div>
                    <div class="mt-4 mb-2 d-flex align-center justify-center">
                        <h4>{{ obj.tag.name }}</h4>
                        <v-btn v-if="idx === 0"
                            variant="outlined"
                            class="ml-2"
                            id="reroll-btn"
                            icon="mdi-sync"
                            size="small"
                            density="comfortable"
                            @click="rerollTag"/>
                    </div>
                    <p>{{ obj.tag.description }}</p>
                </div>

                <div class="d-flex mt-8 item-groups">

                    <div class="d-flex align-center pa-1 rounded" :style="{ border: '2px solid '+answerColor(true, obj.hasTag) }">
                        <div class="mr-1 d-flex flex-wrap" :style="{ minWidth: ((obj.width+5)*2)+'px', maxHeight: (obj.size+10)+'px' }">
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
                                :selected="target ? [target] : []"
                                :data="obj.without.map(idx => itemsToUse[idx])"/>
                        </div>
                        <div class="ml-1 d-flex flex-wrap" :style="{ minWidth: ((obj.width+5)*2)+'px', maxHeight: (obj.size+10)+'px' }">
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
            const [mx, my] = d3.pointer(event, document.body)
            const extra = app.itemColumns.reduce((acc, c) => acc + `<div><b>${capitalize(c.name)}:</b> ${d[c.name]}</div>`, "")
            tt.show(
                `<div>
                    <img src="${mediaPath('teaser', d.teaser)}" style="max-height: 150px; object-fit: contain;"/>
                    <div class="mt-1 text-caption">
                        <div>${d.name}</div>
                        ${d.description ? '<div><b>Description:</b> '+d.description+'</div>' : ''}
                        ${extra}
                    </div>
                </div>`,
                mx, my
            )
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
                id: "show-target",
                attachTo: {
                    element: "#sim-target",
                    on: "bottom"
                },
                scrollToHandler: function() {
                    window.scrollTo(0, 0)
                },
                buttons: [
                    { text: "close tutorial", action: tutorial.cancel, classes: "bg-error" },
                    { text: "next", action: tutorial.next, classes: "bg-primary" },
                ],
                text: `This is your target ${single}. Your task is to find
                    <b>other similar ${plural}</b> from our dataset by answering a few questions.`
            },{
                id: "show-question",
                attachTo: {
                    element: ".binsearch-q",
                    on: "bottom"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `Each questions splits the remaining ${plural} in half based on a specific tag.
                    You have to decide which group (left or right) makes for a better fit, i.e. which is more similar
                    to your target.`
            },{
                id: "show-text",
                attachTo: {
                    element: () => getLast(document.querySelectorAll(".qtext")),
                    on: "bottom"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `Each question asks you about a specific <b>tag</b>, providing the tag name and description.`
            },{
                id: "click-yes",
                attachTo: {
                    element: () => getLast(document.querySelectorAll(".yes-btn")),
                    on: "bottom"
                },
                text: "Let's try by answering <b>yes</b>!"
            },{
                id: "reroll",
                attachTo: {
                    element: "#reroll-btn",
                    on: "bottom"
                },
                text: `If you don't like or understand the current question tag, you can roll
                    for a different tag by clicking on this button. Try it out!`
            },{
                id: "reroll-result",
                attachTo: {
                    element: ".binsearch-q",
                    on: "bottom"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `Now you have a different tag and the grouping of ${plural} changed.`
            },{
                id: "click-no",
                attachTo: {
                    element: () => getLast(document.querySelectorAll(".no-btn")),
                    on: "bottom"
                },
                text: `You can change a previous answer by clicking on a different answer button.
                    Try changing your answer to <b>no</b>!`
            },{
                id: "submit",
                attachTo: {
                    element: "#submit-btn",
                    on: "bottom"
                },
                buttons: [{ text: "okay", action: tutorialClear, classes: "bg-primary" }],
                text: `When you are already happy with your list of similar ${plural},
                    click here to go to the next step.`
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
        nextTag()
    }

    function rerollTag() {
        let splitTag = null;
        for (let i = 0; i < tagsToUse.length && splitTag === null; ++i) {
            if (tagsLeft.has(tagsToUse[i].id)) {
                splitTag = tagsToUse[i]
            }
        }
        app.addInteraction("step1")
        if (splitTag !== null) {
            tagsLeft.delete(splitTag.id)
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

            const last = split.value.at(0)

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

            logAction({
                desc: "reroll",
                step: split.value.length,
                tag: splitTag,
                with: withTag.map(i => itemsToUse[i].id),
                without: without.map(i => itemsToUse[i].id),
            })

            last.rerolls.push(last.tag)
            last.hasTag = null
            last.tag = splitTag
            last.with = withTag
            last.without = without
            // last.colorsYes = getColorsByCluster(withTag)
            // last.colorsNo = getColorsByCluster(without)

            last.examplesYes = examplesYes.map(idx => itemsToUse[idx].id)
            last.examplesNo = examplesNo.map(idx => itemsToUse[idx].id)
            // last.examplesYesColors = examplesYes.map(idx => getClusterColor(getCluster(idx)))
            // last.examplesNoColors = examplesNo.map(idx => getClusterColor(getCluster(idx)))

            if (tutorial.isActive()) {
                const sid = tutorial.getCurrentStep()
                if (sid.id === "reroll") {
                    tutorialNeedsNext = true
                }
            }
        }
    }

    function itemHasTag(item, tag) {
        return item.allTags.find(t => t.id === tag)
    }
    function getCluster(idx) {
        return allClusters.findIndex(list => list.includes(idx))
    }
    function getClusterColor(cidx) {
        return cidx >= 0 ?
            (cidx < 9 ? d3.schemeObservable10[cidx] : '#e7298a') :
            "lightgrey"
    }
    function getItemColor(idx) {
        return getClusterColor(getCluster(idx))
        // return itemHasTag(itemsToUse[idx], tag) ?
        //     theme.current.value.colors.primary :
        //     theme.current.value.colors.error
    }
    function getColorsByCluster(indices) {
        const obj = {}
        indices.forEach(idx => obj[itemsToUse[idx].id] = getItemColor(idx))
        return obj
    }

    async function nextTag() {
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
            finalItems.value = last.with.concat(last.without).map(idx => itemsToUse[idx].id)
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

        // split.value.forEach(s => {
        //     s.colorsYes = s.with.map(idx => getItemColor(idx, splitTag.id))
        //     s.colorsNo = s.without.map(idx => getItemColor(idx, splitTag.id))
        // })

        const h = getImageHeight(withTag.length, without.length)
        split.value.unshift({
            tag: splitTag,
            hasTag: null,
            with: withTag,
            without: without,
            // colorsYes: getColorsByCluster(withTag),
            // colorsNo: getColorsByCluster(without),
            rerolls: [],
            examplesYes: examplesYes.map(idx => itemsToUse[idx].id),
            examplesNo: examplesNo.map(idx => itemsToUse[idx].id),
            // examplesYesColors: examplesYes.map(idx => getClusterColor(getCluster(idx))),
            // examplesNoColors: examplesNo.map(idx => getClusterColor(getCluster(idx))),
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
                s.rerolls.forEach(id => tagsLeft.add(id))
            }
            // remove splits
            split.value.splice(0, index)
        }

        if (inLastStep.value) {
            finalItems.value = []
            emit("ready", false)
        }

        nextTag()

        sounds.play(SOUND.PLOP)

        if (tutorial.isActive()) {
            const sid = tutorial.getCurrentStep()
            if (sid.id === "click-yes" || sid.id === "click-no") {
                tutorialNeedsNext = true
            }
        }
    }

    function logAction(obj) {
        obj.timestamp = Date.now()
        log.push(obj)
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
            nextTag()
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
        sounds.stopAll()
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