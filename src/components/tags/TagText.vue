<template>
    <span
        :style="{ cursor: selectable ? 'pointer' : null }"
        class="hover-it"
        @click="onClick"
        @pointermove="onHover"
        @pointerleave="onLeave"
        >
        {{ tagObj ? tagObj.name : '?' }}
    </span>
</template>

<script setup>
    import { pointer } from 'd3';
    import { useApp } from '@/stores/app';
    import { useTooltip } from '@/stores/tooltip';
    import DM from '@/use/data-manager';
    import { onMounted, watch } from 'vue';
    import { isVideo, mediaPath } from '@/use/utility';

    const app = useApp()
    const tt = useTooltip()

    const props = defineProps({
        id: {
            type: Number,
            required: false
        },
        tag: {
            type: Object,
            required: false
        },
        itemId: {
            type: Number,
            required: false
        },
        selectable: {
            type: Boolean,
            default: true
        },
        preventSelect: {
            type: Boolean,
            default: false
        },
        preventContext: {
            type: Boolean,
            default: false
        },
        preventHover: {
            type: Boolean,
            default: false
        },
        hideEvidence: {
            type: Boolean,
            default: false
        },
        stopPropagation: {
            type: Boolean,
            default: false
        }
    })

    const emit = defineEmits(["click", "right-click", "hover"])

    const tagObj = ref({
        id: -1,
        name: "?"
    })

    const item = ref(null)
    const itemEv = ref([])

    function onClick(event) {
        if (props.stopPropagation) event.stopPropagation()
        if (!props.selectable) return
        if (!props.preventSelect) {
            app.toggleSelectByTag([tagObj.value.id])
        }
        emit("click", tagObj.value, event)

    }

    function onHover(event) {
        emit("hover", tagObj.value, event)
        if (props.preventHover) return
        const [mx, my] = pointer(event, document.body)
        const desc = tagObj.value.description ? "</br>"+tagObj.value.description : ""
        let evStr = ""
        if (!props.hideEvidence && itemEv.value.length > 0) {
            evStr = "</br>" + itemEv.value.reduce((acc, url) => {
                return acc + (isVideo(url) ?
                    `<video src=${mediaPath('evidence', url)}
                        width="80"
                        height="80"
                        class="mr-1 mb-1 bordered-grey-thin"
                        autoplay="true"
                        loop="true"
                        style="object-fit: contain;"/>` :
                    `<img src=${mediaPath('evidence', url)}
                        width="80"
                        height="80"
                        class="mr-1 mb-1 bordered-grey-thin"
                        style="object-fit: contain;"/>`)
            }, "")
        }

        tt.show(`${tagObj.value.name}${desc}${evStr}`, mx, my)
    }
    function onLeave(event) {
        emit("hover", null, event)
        if (props.preventHover) return
        tt.hide()
    }

    function readItem() {
        if (props.itemId) {
            item.value = DM.getDataItem("items", props.itemId)
            itemEv.value = DM.getDataBy("evidence", d => {
                return d.filepath &&
                    d.item_id === props.itemId &&
                    d.code_id === app.activeCode &&
                    d.tag_id === tagObj.value.id
                }
            ).map(d => d.filepath)
        } else {
            item.value = null
            itemEv.value = []
        }
    }
    function read() {
        if (props.id) {
            tagObj.value = DM.getDataItem("tags", props.id)
        } else {
            tagObj.value = props.tag
        }
        readItem()
    }

    onMounted(read)

    watch(() => props.id, read)
    watch(() => props.tag, read)
    watch(() => props.itemId, readItem)
</script>