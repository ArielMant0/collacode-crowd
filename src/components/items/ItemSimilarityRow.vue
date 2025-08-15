<template>
    <v-sheet class="d-flex align-center prevent-select"
        :class="{ 'flex-column': vertical, 'align-center': vertical }">

        <div class="text-caption mt-1 mb-1">
            <div v-for="t in tags" class="text-dots" style="text-align: center;" :style="{ maxWidth: imageWidth+'px' }">
                <TagText :tag="t"/>
            </div>
        </div>

        <div :style="{ opacity: disabled ? 0.5 : 1 }">
            <ItemTeaser v-if="items.length > 0"
                :item="items[showIndex]"
                @click="emit('click', items[showIndex])"
                :width="imageWidth"
                :height="imageHeight"
                :border-size="3"
                :border-color="getItemColor(items[showIndex].id)"
                @dragstart="it => emit('dragstart-item', it)"
                @drag="it => emit('drag-item', it)"
                draggable
                prevent-open
                prevent-context/>
            <div v-if="!hideButtons" class="d-flex justify-space-between mt-1">
                <v-btn
                    style="width: 49%;"
                    class="text-caption"
                    :disabled="disabled"
                    @click="setSim(0)"
                    :color="disabled && choice !== 0  ? 'default' : 'error'"
                    density="compact">
                    hard no
                </v-btn>
                <v-btn
                    style="width: 49%;"
                    class="text-caption"
                    :disabled="disabled"
                    @click="setSim(0.25)"
                    :color="disabled && choice !== 0.25  ? 'default' : '#fc3d23'"
                    density="compact">
                    no
                </v-btn>
            </div>
            <div v-if="!hideButtons" class="d-flex justify-space-between mt-1">
                <v-btn
                    style="width: 49%;"
                    class="text-caption"
                    :disabled="disabled"
                    @click="setSim(1)"
                    :color="disabled && choice !== 1 ? 'default' : 'primary'"
                    density="compact">
                    hard yes
                </v-btn>
                <v-btn
                    style="width: 49%;"
                    class="text-caption"
                    :disabled="disabled"
                    @click="setSim(0.75)"
                    :color="disabled && choice !== 0.75  ? 'default' : 'secondary'"
                    density="compact">
                    yes
                </v-btn>
            </div>
        </div>
        <div class="d-flex flex-wrap justify-space-between align-start mt-2"
            :style="{
                minWidth: imageWidth+'px',
                maxWidth: imageWidth+'px',
                minHeight: imageHeight+'px',
            }">
            <ItemTeaser v-for="ex in examples"
                class="mb-1"
                :item="ex"
                @click="emit('click-item', ex)"
                :width="miniImageWidth"
                :height="miniImageHeight"
                @dragstart="emit('dragstart-item', ex)"
                @drag="emit('drag-item', ex)"
                :border-size="2"
                :border-color="getItemColor(ex.id)"
                draggable
                prevent-open
                prevent-context/>
        </div>

        <div class="d-flex flex-wrap justify-start mt-1"
            style="width: 100%;"
            :style="{ opacity: disabled ? 0.5 : 1 }">
            <div v-for="d in otherItems" :key="d.id"
                style="margin: 2px; cursor: pointer; width: 25px; height: 25px;"
                draggable="true"
                class="plop-in"
                :style="{
                    border: '1px solid '+ (highlights.includes(d.id) ?
                        theme.current.value.colors.primary :
                        '#aaa'),
                    backgroundColor: highlights.includes(d.id) ?
                        theme.current.value.colors.secondary :
                        '#ccc'
                }"
                @mouseenter="e => onHover(d, e)"
                @mousemove="e => onHover(d, e)"
                @mouseleave="e => onHover(null, e)"
                @dragstart="onDragStart(d)"
                @drag="emit('drag-item', d)"
                @click="emit('click-item', d)">
            </div>

        </div>
    </v-sheet>
</template>

<script setup>
    import { range } from 'd3';
    import { computed, onMounted, watch } from 'vue';
    import ItemTeaser from './ItemTeaser.vue';
    import { useTooltip } from '@/stores/tooltip';
    import { useTheme } from 'vuetify';
    import DM from '@/use/data-manager';
    import TagText from '../tags/TagText.vue';
    import { sortObjByValue } from '@/use/sorting';

    const tt = useTooltip()
    const theme = useTheme()

    const props = defineProps({
        items: {
            type: Array,
            required: true
        },
        imageWidth: {
            type: Number,
            default: 160
        },
        imageHeight: {
            type: Number,
            default: 80
        },
        choice: {
            type: Number,
            default: -1
        },
        showIndex: {
            type: Number,
            default: 0
        },
        targets: {
            type: Array,
            default: () => ([])
        },
        highlights: {
            type: Array,
            default: () => ([])
        },
        selected: {
            type: Boolean,
            default: false
        },
        disabled: {
            type: Boolean,
            default: false
        },
        vertical: {
            type: Boolean,
            default: false
        },
        hideButtons: {
            type: Boolean,
            default: false
        },
        numExamples: {
            type: Number,
            default: 4
        },
        numTags: {
            type: Number,
            default: 2
        }
    })

    const emit = defineEmits([
        "change",
        "click", "click-item",
        "dragstart-item", "drag-item"
    ])

    const tags = ref([])
    const examples = ref([])
    const otherItems = computed(() => props.items.filter(d => props.items[props.showIndex].id !== d.id && !examples.value.find(e => e.id === d.id)))
    const miniImageWidth = computed(() => (props.imageWidth-5) * (examples.value.length === 1 ? 1 : 0.5))
    const miniImageHeight = computed(() => (props.imageHeight-5) * (examples.value.length === 1 ? 1 : 0.5))

    function getItemColor(id) {
        if (props.highlights.includes(id)) {
            return theme.current.value.colors.secondary
        }
        return null
    }

    function setSim(value) {
        emit("change", value)
    }

    function onDragStart(d) {
        tt.hide()
        emit('dragstart-item', d)
    }

    function onHover(d, event) {
        if (d === null) {
            tt.hide()
        } else {
            tt.showItem(event, d, true)
        }
    }

    function readExamples() {
        const cands = range(props.items.length).filter(i => i !== props.showIndex)
        examples.value =  cands.slice(0, props.numExamples).map(i => props.items[i])
    }

    function read() {
        const dom = DM.getDataBy("tags", d => d.is_leaf === 1)
        const tagCounts = DM.getData("tags_counts", false)

        const freq = new Map()
        const globalSize = DM.getSizeBy("items", d => d.allTags.length > 0)
        // calculate global tag frequencies
        dom.forEach(d => freq.set(d.id, tagCounts.get(d.id) / globalSize))

        const counts = new Map()
        // counts tags
        props.items.forEach(d => d.allTags.forEach(t => counts.set(t.id, (counts.get(t.id) || 0) + 1)))

        const tmp = dom
            .filter(d => counts.has(d.id))
            .map(d => {
                const obj = { id: d.id, name: d.name, description: d.description}
                const abs = counts.get(d.id)
                obj.abs = abs ? abs : 0
                obj.rel = abs ? abs / props.items.length : 0
                obj.diff = obj.rel - freq.get(d.id)
                return obj
            })

        tmp.sort(sortObjByValue("diff", { ascending: false }))
        tags.value = tmp.slice(0, props.numTags)

        readExamples()
    }

    onMounted(read)

    watch(() => props.items, read)

</script>

<style scoped>
.plop-in {
    animation: growBounce 700ms ease-in;
}
.plop-in:hover {
    filter: brightness(0.5);
}

@keyframes growBounce {
	0% {
		animation-timing-function: ease-in;
		opacity: 0;
		transform: scale(0);
	}

	38% {
		animation-timing-function: ease-out;
		opacity: 1;
		transform: scale(1);
	}

	55% {
		animation-timing-function: ease-in;
		transform: scale(0.7);
	}

	72% {
		animation-timing-function: ease-out;
		transform: scale(1);
	}

	81% {
		animation-timing-function: ease-in;
		transform: scale(0.84);
	}

	89% {
		animation-timing-function: ease-out;
		transform: scale(1);
	}

	95% {
		animation-timing-function: ease-in;
		transform: scale(0.95);
	}

	100% {
		animation-timing-function: ease-out;
		transform: scale(1);
	}
}
</style>