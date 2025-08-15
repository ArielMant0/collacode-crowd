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
    import { useTooltip } from '@/stores/tooltip';
    import DM from '@/use/data-manager';
    import { onMounted, watch } from 'vue';

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
            default: false
        },
        preventContext: {
            type: Boolean,
            default: true
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

    function onClick(event) {
        if (props.stopPropagation) event.stopPropagation()
        if (!props.selectable) return
        emit("click", tagObj.value, event)
    }

    function onHover(event) {
        emit("hover", tagObj.value, event)
        if (props.preventHover) return
        const [mx, my] = pointer(event, document.body)
        const desc = tagObj.value.description ? "</br>"+tagObj.value.description : ""
        tt.show(`${tagObj.value.name}${desc}`, mx, my)
    }
    function onLeave(event) {
        emit("hover", null, event)
        if (props.preventHover) return
        tt.hide()
    }

    function readItem() {
        if (props.itemId) {
            item.value = DM.getDataItem("items", props.itemId)
        } else {
            item.value = null
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