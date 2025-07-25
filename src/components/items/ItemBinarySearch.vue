<template>
    <div style="width: min-content;" class="pa-2">
        <div>
            <div v-for="(obj, idx) in split" :key="obj.tag.id" class="binsearch-q">

                <div style="text-align: center;" class="qtext">
                    <div v-if="idx === 0">
                        Does this tag apply to the {{ app.itemName }}?
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
                        <div class="mr-1">
                            <ItemTeaser v-for="exId in obj.examplesYes"
                                :id="exId"
                                :width="obj.width"
                                :height="obj.height"
                                prevent-click
                                prevent-context
                                class="mb-1"/>
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
                        <div class="ml-1">
                            <ItemTeaser v-for="exId in obj.examplesNo"
                                :id="exId"
                                :width="obj.width"
                                :height="obj.height"
                                prevent-click
                                prevent-context
                                class="mb-1"/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import * as d3 from 'd3'
    import { ref, onMounted, onBeforeUnmount } from 'vue';
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

    const app = useApp()
    const tt = useTooltip()
    const theme = useTheme()

    const tutorial = useShepherd({
        useModalOverlay: true,
        defaultStepOptions: {
            classes: 'shadow-md bg-surface-light arrow-primary',
            scrollTo: true
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

    const emit = defineEmits(["submit", "tutorial-start", "tutorial-complete", "tutorial-cancel"])

    const inventory = ref([])
    const split = ref([])

    let log = []
    let itemsToUse, tagsToUse
    const itemsLeft = new Set()
    const tagsLeft = new Set()


    function getImageHeight(n, m) {
        const bs = getBubbleSize(n, m)
        return Math.max(50, Math.min(160, Math.round(bs / 40)))
    }

    function getBubbleSize(n, m) {
        const s = Math.max(n, m)
        return Math.max(100, Math.min(Math.round(Math.sqrt(s) * 20), 300))
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
                buttons: [
                    { text: "close tutorial", action: tutorial.cancel, classes: "bg-error" },
                    { text: "next", action: tutorial.next, classes: "bg-primary" },
                ],
                text: `This is your target ${single}. Your task is to find
                    <b>other similar ${plural}</b> from our dataset by answers a few questions.`
            },{
                id: "show-question",
                attachTo: {
                    element: ".binsearch-q",
                    on: "top"
                },
                buttons: [{ text: "next", action: tutorial.next }],
                text: `You will be asked a feq questions about the target ${single}.
                    Each questions reduces the number of ${plural} by roughly half.
                    When you only have ${props.maxItems} ${plural} left, we automatically
                    proceed to the next step.`
            },{
                id: "show-text",
                attachTo: {
                    element: () => getLast(document.querySelectorAll(".qtext")),
                    on: "top"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `Each question asks you about a specific <b>tag</b>, providing the tag name
                    and description. You need to decide if the tag applies to the target ${single}.`
            },{
                id: "click-yes",
                attachTo: {
                    element: () => getLast(document.querySelectorAll(".yes-btn")),
                    on: "bottom"
                },
                buttons: [{ text: "next", action: choose.bind(null, true, 0), classes: "bg-primary" }],
                text: "Let's try by answering <b>yes</b>!"
            },{
                id: "reroll",
                attachTo: {
                    element: "#reroll-btn",
                    on: "bottom"
                },
                buttons: [{ text: "next", action: rerollTag, classes: "bg-primary" }],
                text: `If you don't like or understand the current question tag, you can roll
                    for a different tag by clicking on this button. Try it out!`
            },{
                id: "reroll-result",
                attachTo: {
                    element: ".binsearch-q",
                    on: "bottom"
                },
                buttons: [{ text: "next", action: tutorial.next, classes: "bg-primary" }],
                text: `As you can see, the question and the grouping of ${plural} changed.`
            },{
                id: "click-no",
                attachTo: {
                    element: () => getLast(document.querySelectorAll(".no-btn")),
                    on: "bottom"
                },
                buttons: [{ text: "next", action: choose.bind(null, false, 1), classes: "bg-primary" }],
                text: `You can change a previous answer by clicking on a different answer button.
                    Try changing your answer to <b>no</b>!`
            },{
                id: "submit",
                attachTo: {
                    element: "#submit-btn",
                    on: "bottom"
                },
                buttons: [{ text: "done", action: tutorialClear, classes: "bg-primary" }],
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

    function submit(fromClick=false) {
        const indices = itemsLeft.size <= props.maxItems ?
            Array.from(itemsLeft.values()) :
            randomChoice(Array.from(itemsLeft.values()), props.maxItems)

        if (fromClick) {
            app.addInteraction("step1")
        }

        emit("submit", indices.map(idx => itemsToUse[idx]), log)
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
            logAction({
                desc: "reroll",
                step: split.value.length,
                tag: splitTag,
                with: withTag.map(i => itemsToUse[i].id),
                without: without.map(i => itemsToUse[i].id),
            })
            last.hasTag = null
            last.tag = splitTag
            last.with = withTag
            last.without = without

            const numEx = Math.max(last.examplesYes.length, last.examplesNo.length)
            // get random examples
            const examplesYes = withTag.length > numEx ?
                randomChoice(withTag, numEx) :
                withTag

            const examplesNo = without.length > numEx ?
                randomChoice(without, numEx) :
                without

            last.examplesYes = examplesYes.map(idx => itemsToUse[idx].id)
            last.examplesNo = examplesNo.map(idx => itemsToUse[idx].id)

            if (tutorial.isActive()) {
                const sid = tutorial.getCurrentStep()
                if (sid.id === "reroll") {
                    setTimeout(() => tutorial.next(), 250)
                }
            }
        }
    }

    async function nextTag() {
        // remove
        if (split.value.length > 0) {
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

        if (itemsLeft.size / 2 <= props.minItems) {
            return submit()
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

        // choose first tag as the one to split on (if there are enough items on both sides)
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

        const numEx = Math.max(2, props.numExamples - split.value.length)
        // get random examples
        const examplesYes = withTag.length > numEx ?
            randomChoice(withTag, numEx) :
            withTag

        const examplesNo = without.length > numEx ?
            randomChoice(without, numEx) :
            without

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

        if (tutorial.isActive()) {
            const sid = tutorial.getCurrentStep()
            if (sid.id === "click-yes" || sid.id === "click-no") {
                setTimeout(() => tutorial.next(), 250)
            }
        }

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

        nextTag()
    }

    function logAction(obj) {
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
        split.value = []
        inventory.value = []
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

    onBeforeUnmount(() => {
        if (tutorial.isActive()) {
            tutorial.cancel()
        }
    })

    onMounted(function() {
        prepareTutorial()
        read()
        reset(nextTag)
    })

</script>