<template>
    <div style="text-align: center; min-width: 100%;">

        <div class="text-h5 mb-1">
            click or drag <b class="text-decoration-underline">only</b> similar {{ app.itemName }}s into a fitting category
        </div>
        <div class="mb-2 text-caption">
            it's also okay to select none if there is no good fit
        </div>

        <div class="d-flex align-start justify-center" style="width: 100%;">

            <div class="d-flex flex-column mr-4" style="max-width: 49%; width: 49%;">

                <div class="pa-2 mt-1 rounded-lg" style="width: 100%; border: 2px dashed black;">

                    <h3 class="sectitle">{{ app.itemNameCaptial }}s with similar names</h3>
                    <div class="d-flex flex-wrap justify-center align-start"
                        style="width: 100%; max-width: 100%;"
                        @drop.prevent="dropItem(0)"
                        @dragover.prevent
                        :style="{ minHeight: ((imageHeight+10)*2)+'px' }">
                        <ItemTeaser v-for="(item, idx) in suggs.byName"
                            :id="item.id"
                            :width="imageWidth"
                            :height="imageHeight"
                            prevent-open
                            prevent-context
                            draggable
                            @click="setItem(item.id, 'name', idx, 2)"
                            @dragstart="startDrag(item.id, 'name', idx)"
                            style="cursor: grab"
                            class="mr-1 mb-1"/>
                    </div>
                </div>

                <div class="rounded-lg pa-2 mt-2" style="width: 100%; border: 2px dashed black;">
                    <h3 class="sectitle">{{ app.itemNameCaptial }}s picked by others</h3>
                    <div class="d-flex flex-wrap justify-center align-start"
                        style="width: 100%; max-width: 100%;"
                        @drop.prevent="dropItem(0)"
                        @dragover.prevent
                        :style="{ minHeight: ((imageHeight+10)*2)+'px' }">
                        <ItemTeaser v-for="(item, idx) in suggs.byCrowd"
                            :id="item.id"
                            :width="imageWidth"
                            :height="imageHeight"
                            prevent-open
                            prevent-context
                            draggable
                            @click="setItem(item.id, 'crowd', idx, 2)"
                            @dragstart="startDrag(item.id, 'crowd', idx)"
                            style="cursor: grab"
                            class="mr-1 mb-1"/>
                    </div>
                </div>

                <div class="rounded-lg pa-2 mt-2" style="width: 100%; border: 2px dashed black">

                    <v-text-field v-model="search"
                        label="Search for items by name.."
                        prepend-inner-icon="mdi-magnify"
                        variant="outlined"
                        density="compact"
                        class="mb-1"
                        style="width: 100%;"
                        @update:model-value="searchByName"
                        clearable
                        hide-details
                        single-line/>
                    <div class="d-flex flex-wrap justify-center align-start"
                        @drop.prevent="dropItem(0)"
                        @dragover.prevent
                        @dragenter="onDragEnter"
                        @dragleave="onDragLeave"
                        style="width: 100%; max-width: 100%;"
                        :style="{ minHeight: ((imageHeight+10)*1)+'px' }">
                        <ItemTeaser v-for="(item, idx) in bySearch"
                            :id="item.id"
                            :width="imageWidth"
                            :height="imageHeight"
                            prevent-open
                            prevent-context
                            draggable
                            @click="setItem(item.id, 'search', idx, 2)"
                            @dragstart="startDrag(item.id, 'search', idx)"
                            style="cursor: grab"
                            class="mr-1 mb-1"/>
                    </div>
                </div>
            </div>

            <div class="ml-4" style="max-width: 49%; width: 35%;">

                <div class="d-flex flex-column align-center pa-2 mb-1 rounded-lg drop-area"
                    @drop.prevent="dropItem(2)"
                    @dragover.prevent
                    @dragenter="e => onDragEnter(e, 'bg-primary-light')"
                    @dragleave="e => onDragLeave(e, 'bg-primary-light')"
                    :style="{ border: '2px dashed '+theme.current.value.colors.primary }"
                    style="width: 100%; max-width: 100%;">
                    <h3 class="d-flex align-center">
                        <v-tooltip location="top center">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" class="mr-1" size="sm">mdi-information-outline</v-icon>
                            </template>
                            <template #default>
                                <div>
                                    <div>select {{ app.itemName }}s <b>similar</b> to the target</div>
                                    <p class="mt-1">
                                        there should only be small differences, but the majority
                                        of the core game loop should be the same
                                    </p>
                                </div>
                            </template>
                        </v-tooltip>
                        Very Similar
                        <span v-if="itemLimit > 0" class="ml-1 text-caption">(max. {{ itemLimit }})</span>
                    </h3>
                    <div class="d-flex flex-wrap justify-center align-start pa-2"
                        style="pointer-events: none; width: 100%; max-width: 100%;"
                        :style="{ minHeight: ((imageHeight+10)*3)+'px' }">
                        <ItemTeaser v-for="item in highFixed"
                            :id="item.id"
                            :width="imageWidth"
                            :height="imageHeight"
                            prevent-open
                            prevent-context
                            prevent-click
                            draggable
                            @dragstart="startDrag(item.id)"
                            style="cursor: grab; pointer-events: all;"
                            class="mr-1 mb-1"/>
                        <ItemTeaser v-for="item in highItems"
                            :id="item.id"
                            :width="imageWidth"
                            :height="imageHeight"
                            prevent-open
                            prevent-context
                            @click="resetItem(item.id)"
                            draggable
                            @dragstart="startDrag(item.id)"
                            style="cursor: grab; pointer-events: all;"
                            class="mr-1 mb-1"/>
                    </div>
                </div>

                <div
                    @drop.prevent="dropItem(1)"
                    @dragover.prevent
                    @dragenter="e => onDragEnter(e, 'bg-tertiary-light')"
                    @dragleave="e => onDragLeave(e, 'bg-tertiary-light')"
                    class="d-flex flex-column align-center rounded-lg pa-2 mt-4 drop-area"
                    :style="{ border: '2px dashed '+theme.current.value.colors.tertiary }"
                    style="width: 100%; max-width: 100%;">
                    <h3 class="d-flex align-center">
                        <v-tooltip location="top center">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" class="mr-1" size="sm">mdi-information-outline</v-icon>
                            </template>
                            <template #default>
                                <div>
                                    <div>select {{ app.itemName }}s <b>similar</b> to the target</div>
                                    <p class="mt-1">
                                        there can be some differences (e.g. regarding the setting)
                                        but there should be large overlap regarding the core game loop
                                    </p>
                                </div>
                            </template>
                        </v-tooltip>
                        Similar
                        <span v-if="itemLimit > 0" class="ml-1 text-caption">(max. {{ itemLimit }})</span>
                    </h3>
                    <div class="d-flex flex-wrap justify-center align-start pa-2"
                        style="pointer-events: none; width: 100%; max-width: 100%;"
                        :style="{ minHeight: ((imageHeight+10)*3)+'px' }">
                        <ItemTeaser v-for="item in medFixed"
                            :id="item.id"
                            :width="imageWidth"
                            :height="imageHeight"
                            prevent-open
                            prevent-context
                            prevent-click
                            draggable
                            @dragstart="startDrag(item.id)"
                            style="cursor: grab; pointer-events: all;"
                            class="mr-1 mb-1"/>
                        <ItemTeaser v-for="item in medItems"
                            :id="item.id"
                            :width="imageWidth"
                            :height="imageHeight"
                            prevent-open
                            prevent-context
                            @click="resetItem(item.id)"
                            draggable
                            @dragstart="startDrag(item.id)"
                            style="cursor: grab; pointer-events: all;"
                            class="mr-1 mb-1"/>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { useApp } from '@/stores/app'
    import { reactive, computed, onMounted } from 'vue'
    import ItemTeaser from './ItemTeaser.vue'
    import { useDisplay, useTheme } from 'vuetify'
    import DM from '@/use/data-manager'
    import { getSimilarByTarget } from '@/use/data-api'
    import { useToast } from 'vue-toastification'
    import { getGameWords, getStopWords } from '@/use/utility'
    import { SOUND, useSounds } from '@/stores/sounds'

    const app = useApp()
    const theme = useTheme()
    const toast = useToast()
    const sounds = useSounds()
    const { md, lg, xl, xxl } = useDisplay()

    const props = defineProps({
        target: {
            type: Number,
            required: true
        },
        items: {
            type: Array,
            required: true
        },
        imageWidth: {
            type: Number,
            default: 140
        },
        imageHeight: {
            type: Number,
            default: 70
        },
        itemLimit: {
            type: Number,
            default: 0
        }
    })

    const emit = defineEmits(["update", "search"])

    const itemHigh = reactive(new Set())
    const itemMed = reactive(new Set())

    const suggs = reactive({
        byName: [],
        byCrowd: [],
    })
    const search = ref("")
    const bySearch = ref([])

    const chosen = ref([])
    const fixed = reactive(new Set())

    const medFixed = computed(() => props.items.filter(d => d.value === 1))
    const medItems = computed(() => chosen.value.filter(d => itemMed.has(d.id)))
    const highFixed = computed(() => props.items.filter(d => d.value === 2))
    const highItems = computed(() => chosen.value.filter(d => itemHigh.has(d.id)))

    let dragId = null, dragOrigin, dragIndex
    let dragElem = null, dragClassName = ""

    let searchHistory = []

    function searchByName() {
        app.addInteraction("step3")
        if (search.value && search.value.length > 2) {
            const name = new RegExp(search.value, "gi")

            const lower = search.value.toLowerCase()
            const contained = searchHistory.find(s => s.includes(lower))
            if (!contained) {
                searchHistory = searchHistory.filter(s => !lower.includes(s))
                searchHistory.push(lower)
            }
            emit("search", searchHistory)

            bySearch.value = DM.getDataBy("items", d => !isChosenItem(d.id) && name.test(d.name))
                .map(d => ({ id: d.id, value: 0 }))
        } else {
            bySearch.value = []
            chosen.value.forEach(d => {
                if (d.origin === "search") {
                    d.origin = null
                }
            })
        }
    }
    async function getSuggestions() {
        const stopWords = new Set(getStopWords())
        const gameWords = getGameWords()
        const rSp = new RegExp("\\s{2,}", "gi")
        const rDel = new RegExp("[&®©™'\(\)0-9\.,’;_]", "gi")
        const process = name => {
            let lower = name.toLowerCase()
            gameWords.forEach(w => {
                if (lower.includes(w)) {
                    lower = lower.replace(w, "")
                }
            })
            const str = lower.replaceAll(rDel, "").replaceAll(rSp, " ")
            return str.split(/[:\-]/gi)
                .map(s => s
                    .split(" ")
                    .map(w => w.trim())
                    .filter(w => !stopWords.has(w))
                    .join(" ")
                    .trim()
                )
                .filter(s => s && s.length > 0)
        }
        const names = DM.getDataBy("items", d => isFixedItem(d.id)).map(d => process(d.name)).flat()
        const other = DM.getDataBy("items", d => {
            const dn = process(d.name)
            return !isFixedItem(d.id) && names.some(n1 => dn.some(n2 => n1 === n2))
        })
        suggs.byName = other.map(d => ({ id: d.id }))
        const crowd = await getSimilarByTarget(props.target, 20)
        suggs.byCrowd = crowd
            .filter(d => !isFixedItem(d.item_id) && !suggs.byName.find(dd => dd.id === d.item_id))
            .slice(0, 10)
            .map(d => ({ id: d.item_id, value: 0 }))
    }

    function isChosenItem(id) {
        return chosen.value.find(d => d.id === id) || isFixedItem(id)
    }
    function isFixedItem(id) {
        return fixed.has(id) || id === props.target
    }

    function startDrag(id, origin=null, index=-1) {
        dragId = id
        dragOrigin = origin
        dragIndex = index
        app.addInteraction("step3")
    }
    function dropItem(where=0) {
        if (!dragId) return
        setItem(dragId, dragOrigin, dragIndex, where)
        dragId = null
        dragOrigin = null
        dragIndex = -1
        if (dragElem) {
            dragElem.classList.remove(dragClassName)
            dragClassName = ""
            dragElem = null
        }
    }

    function onDragEnter(event, classname="") {
        // color background of drop area on enter
        if (event.target.classList.contains("drop-area")) {
            event.target.classList.add(classname)
            dragElem = event.target
            dragClassName = classname
        }
    }
    function onDragLeave(event, classname="") {
        // reset background color of drop area on leave
        if (event.target.classList.contains("drop-area")) {
            event.target.classList.remove(classname)
            dragElem = null
            dragClassName = ""
        }
    }

    function addToOrigin(origin, id) {
        if (!origin || id <= 0) return
        switch(origin) {
            case "search":
                bySearch.value.push({ id: id})
                break
            case "name":
                suggs.byName.push({ id: id})
                break
            case "crowd":
                suggs.byCrowd.push({ id: id})
                break
        }
    }
    function removeFromOrigin(origin, index) {
        if (!origin || index < 0) return
        switch(origin) {
            case "search":
                bySearch.value.splice(index, 1)
                break
            case "name":
                suggs.byName.splice(index, 1)
                break
            case "crowd":
                suggs.byCrowd.splice(index, 1)
                break
        }
    }
    function setItem(id, origin, index, where=0) {
        app.addInteraction("step3")
        sounds.play(SOUND.PLOP)
        if (where === 2) {
            if (props.itemLimit > 0 && (itemHigh.size+highFixed.value.length) >= props.itemLimit) {
                return toast.warning(`maximum number of ${app.itemName}s reached`)
            }

            const inFixed = props.items.find(d => d.id === id)
            if (inFixed) {
                inFixed.value = 2
            } else {
                if (!itemMed.has(id) && !itemHigh.has(id)) {
                    chosen.value.push({ id: id, origin: origin })
                }
                removeFromOrigin(origin, index)

                itemMed.delete(id)
                itemHigh.add(id)
            }

        } else if (where === 1) {
            if (props.itemLimit > 0 && (itemMed.size+medFixed.value.length) >= props.itemLimit) {
                return toast.warning(`maximum number of ${app.itemName}s reached`)
            }

            const inFixed = props.items.find(d => d.id === id)
            if (inFixed) {
                inFixed.value = 1
            } else {
                if (!itemMed.has(id) && !itemHigh.has(id)) {
                    chosen.value.push({ id: id, origin: origin })
                }

                removeFromOrigin(origin, index)
                itemHigh.delete(id)
                itemMed.add(id)
            }
        } else {
            const idx = chosen.value.findIndex(d => d.id === id)

            let org = null
            if (idx >= 0) {
                org = chosen.value[idx].origin
                chosen.value.splice(idx, 1)
                if (org) {
                    addToOrigin(org, id)
                }
            }
            itemMed.delete(id)
            itemHigh.delete(id)
        }
        update()
    }

    function resetItem(id) {
        setItem(id, "", -1, 0)
    }

    function update() {
        emit(
            "update",
            highItems.value.map(d => ({ id: d.id, value: 2, origin: d.origin }))
                .concat(medItems.value.map(d => ({ id: d.id, value: 1, origin: d.origin })))
        )
    }

    function init() {
        searchHistory = []
        fixed.clear()
        props.items.forEach(d => fixed.add(d.id))
        getSuggestions()
    }

    onMounted(init)

</script>

<style scoped>
.sectitle {
    font-size: 22px;
    font-weight: 400;
    text-transform: uppercase;
    border-radius: 4px;
    width: 100%;
    padding: 3px 0px;
    margin-bottom: 10px;
    vertical-align: middle;
}
</style>