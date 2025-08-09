<template>
    <div style="text-align: center; width: 100%;">

        <div class="text-h5 mb-1">
            click or drag <b class="text-decoration-underline">only</b> similar {{ app.itemName }}s into their fitting category
        </div>
        <div class="mb-2 text-caption">
            it's also okay to select none if there is no good fit
        </div>

        <div class="d-flex align-start justify-center" style="width: 100%;">

            <div
                class="d-flex flex-column align-center bordered-grey-light-thin pa-2 mr-4 rounded-lg"
                style="max-width: 49%; width: 49%; border: 2px dashed black;">
                <h3 class="sectitle">Candidates</h3>
                <div class="d-flex flex-wrap justify-center align-start"
                    @drop.prevent="dropItem(0)"
                    @dragover.prevent
                    style="width: 100%; max-width: 100%;"
                    :style="{ minHeight: ((imageHeight+10)*4)+'px' }">
                    <ItemTeaser v-for="item in restItems"
                        :item="item"
                        :width="imageWidth"
                        :height="imageHeight"
                        prevent-open
                        prevent-context
                        draggable
                        @click="setItem(item.id, 2)"
                        @dragstart="startDrag(item.id)"
                        style="cursor: grab"
                        class="mr-3 mb-3"/>
                </div>
            </div>

            <div class="ml-4" style="max-width: 49%; width: 35%;">

                <div class="d-flex flex-column align-center rounded-lg pa-2 mb-1 drop-area"
                    @drop.prevent="dropItem(2)"
                    @dragover.prevent
                    @dragenter="e => onDragEnter(e, 'bg-primary-light')"
                    @dragleave="e => onDragLeave(e, 'bg-primary-light')"
                    style="width: 100%; max-width: 100%;"
                    :style="{ border: '2px dashed '+theme.current.value.colors.primary }">
                    <h3 class="d-flex align-center">
                        <v-tooltip location="top center">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" class="mr-1" size="sm">mdi-information-outline</v-icon>
                            </template>
                            <template #default>
                                <div>
                                    <div>select {{ app.itemName }}s <b>very similar</b> to your target</div>
                                    <p class="mt-1">
                                        there can be small differences regarding the setting, artstyle,
                                        or minor {{ app.itemName }} mechanics, but the core <b>gameplay</b> should be very similar
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
                        <ItemTeaser v-for="item in highItems"
                            :item="item"
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

                <div class="d-flex flex-column align-center pa-2 mt-4 rounded-lg drop-area"
                    :style="{ border: '2px dashed '+theme.current.value.colors.tertiary }"
                    @drop.prevent="dropItem(1)"
                    @dragover.prevent
                    @dragenter="e => onDragEnter(e, 'bg-tertiary-light')"
                    @dragleave="e => onDragLeave(e, 'bg-tertiary-light')"
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
                                        there can be some differences regarding the setting, artstyle,
                                        or {{ app.itemName }} mechanics, but the core <b>gameplay</b> should be similar
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
                        <ItemTeaser v-for="item in medItems"
                            :item="item"
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
    import { reactive, computed } from 'vue'
    import ItemTeaser from './ItemTeaser.vue'
    import { useDisplay, useTheme } from 'vuetify'
    import { useToast } from 'vue-toastification'
    import { SOUND, useSounds } from '@/stores/sounds'

    const app = useApp()
    const theme = useTheme()
    const toast = useToast()
    const sounds = useSounds()

    const { md, lg, xl, xxl } = useDisplay()

    const props = defineProps({
        items: {
            type: Array,
            required: true
        },
        imageWidth: {
            type: Number,
            default: 120
        },
        imageHeight: {
            type: Number,
            default: 60
        },
        itemLimit: {
            type: Number,
            default: 0
        }
    })

    const emit = defineEmits(["update"])

    const itemHigh = reactive(new Set())
    const itemMed = reactive(new Set())

    const restItems = computed(() => props.items.filter(d => !itemHigh.has(d.id) && !itemMed.has(d.id)))
    const highItems = computed(() => props.items.filter(d => itemHigh.has(d.id)))
    const medItems = computed(() => props.items.filter(d => itemMed.has(d.id)))

    let dragId = null, dragClassName = "", dragElem = null

    function startDrag(id) {
        dragId = id
        app.addInteraction("step2")
    }
    function dropItem(where=0) {
        if (!dragId) return
        setItem(dragId, where)
        dragId = null
        if (dragElem) {
            dragElem.classList.remove(dragClassName)
            dragClassName = ""
            dragElem = null
        }
    }
    function onDragEnter(event, classname) {
        // color background of drop area on enter
        if (event.target.classList.contains("drop-area")) {
            event.target.classList.add(classname)
            dragElem = event.target
            dragClassName = classname
        }
    }
    function onDragLeave(event, classname) {
        // reset background color of drop area on leave
        if (event.target.classList.contains("drop-area")) {
            event.target.classList.remove(classname)
            dragElem = null
            dragClassName = ""
        }
    }
    function setItem(id, where=0) {
        app.addInteraction("step2")
        sounds.play(SOUND.PLOP)
        if (where === 2) {
            if (props.itemLimit > 0 && itemHigh.size >= props.itemLimit) {
                return toast.warning(`maximum number of ${app.itemName}s reached`)
            }
            itemMed.delete(id)
            itemHigh.add(id)
        } else if (where === 1) {
            if (props.itemLimit > 0 && itemMed.size >= props.itemLimit) {
                return toast.warning(`maximum number of ${app.itemName}s reached`)
            }
            itemHigh.delete(id)
            itemMed.add(id)
        } else {
            itemMed.delete(id)
            itemHigh.delete(id)
        }
        update()
    }

    function resetItem(id) {
        setItem(id, 0)
    }

    function update() {
        emit("update", highItems.value.map(d => ({ id: d.id, value: 2 }))
            .concat(medItems.value.map(d => ({ id: d.id, value: 1 }))))
    }

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