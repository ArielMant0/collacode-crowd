<template>
    <div
        :id="elementId"
        class="container item-teaser"
        :class="{ 'prevent-select': draggable }"
        @dragstart="onDragStart"
        @drop="onDrop"
        @drag="onDrag"
        :draggable="draggable"
        :style="{
            width: width+'px',
            fontSize: fontSize+'px',
            cursor: preventClick ? 'default' : 'pointer'
        }">
        <div v-if="showName"
            class="text-caption text-dots"
            :style="{ maxWidth: width+'px' }">
            {{ itemObj.name }}
        </div>
        <v-sheet
            style="position: relative;"
            :class="{ 'rounded': rounded }"
            :style="{ height: height+'px', border: border, padding: padding }">
            <v-img
                :cover="!contain"
                :class="{ 'rounded': rounded }"
                :src="itemObj.teaser ? mediaPath('teaser', itemObj.teaser) : imgUrlS"
                :lazy-src="imgUrlS"
                :width="width"
                :height="height"/>
            <div v-if="!itemObj.teaser || !hideOverlay" :class="{ 'overlay': itemObj.teaser, 'overlay-text': !itemObj.teaser, 'rounded': rounded }"
                style="overflow: hidden;"
                @click="onClick"
                @pointermove="onHover"
                @pointerleave="tt.hide()">
                <div class="text">{{ itemObj.name }}</div>
            </div>
        </v-sheet>
    </div>
</template>

<script setup>
    import { pointer } from 'd3';
    import imgUrlS from '@/assets/__placeholder__s.png'
    import { useApp } from '@/stores/app';
    import { useTooltip } from '@/stores/tooltip';
    import { computed, onBeforeUnmount, onMounted } from 'vue';
    import DM from '@/use/data-manager';
    import { capitalize, mediaPath } from '@/use/utility';

    const app = useApp()
    const tt = useTooltip()

    const props = defineProps({
        id: { type: Number },
        item: { type: Object },
        elementId: {
            type: String,
            default: ""
        },
        width: {
            type: Number,
            default: 160
        },
        height: {
            type: Number,
            default: 80
        },
        contain: {
            type: Boolean,
            default: false
        },
        borderColor: {
            type: String,
        },
        borderStyle: {
            type: String,
            default: "solid"
        },
        borderSize: {
            type: Number,
            default: 1
        },
        rounded: {
            type: Boolean,
            default: false
        },
        zoomOnHover: {
            type: Boolean,
            default: false
        },
        showName: {
            type: Boolean,
            default: false
        },
        preventClick: {
            type: Boolean,
            default: false
        },
        preventOpen: {
            type: Boolean,
            default: false
        },
        preventContext: {
            type: Boolean,
            default: false
        },
        hideOverlay: {
            type: Boolean,
            default: false
        },
        clipName: {
            type: Boolean,
            default: true
        },
        draggable: {
            type: Boolean,
            default: false
        },
    })
    const emit = defineEmits([
        "click",
        "right-click",
        "hover",
        "dragstart", "drag", "drop"
    ])

    const itemObj = reactive({
        id: null,
        name: "",
        teaser: null,
        description: "",
    })

    const fontSize = computed(() => {
        if (props.height < 150) {
            return itemObj.name.length < 20 ? 14 : 12
        } else if (props.height < 50) {
            return itemObj.name.length < 20 ? 12 : 10
        } else if (props.height < 25) {
            return itemObj.name.length < 20 ? 8 : 6
        }
        return itemObj.name.length < 20 ? 20 : 18
    })

    const border = computed(() => {
        if (!props.borderColor) return ""
        return `${props.borderSize}px ${props.borderStyle} ${props.borderColor}`
    })
    const padding = computed(() => {
        if (border.value.length === 0) {
            return "0px"
        }
        return Math.max(1, Math.min(10, Math.round(Math.min(props.width, props.height) * 0.01))) + "px"
    })

    onBeforeUnmount(() => tt.hide())

    function onDragStart(event) {
        if (!props.draggable) return
        emit('dragstart', itemObj, event)
    }
    function onDrag(event) {
        if (!props.draggable) return
        emit('drag', itemObj, event)
    }
    function onDrop(event) {
        emit('drop', itemObj, event)
    }

    function onClick() {
        if (props.preventClick) return
        emit("click")
    }
    function onHover(event) {
        if (!itemObj.teaser || !props.zoomOnHover) return
        const [mx, my] = pointer(event, document.body)
        const extra = app.itemColumns.reduce((acc, c) => acc + `<div><b>${capitalize(c.name)}:</b> ${itemObj[c.name]}</div>`, "")
        tt.show(
            `<div>
                <img src="${mediaPath('teaser', itemObj.teaser)}" style="max-height: 250px; object-fit: contain;"/>
                <div class="mt-1 text-caption">
                    <div>${itemObj.name}</div>
                    ${itemObj.description ? '<div><b>Description:</b> '+itemObj.description+'</div>' : ''}
                    ${extra}
                </div>
            </div>`,
            mx, my
        )
        emit("hover")
    }

    function readItem() {
        if (props.id) {
            const tmp = DM.getDataItem("items_id", props.id)
            itemObj.name = tmp.name ? tmp.name : ""
            itemObj.teaser = tmp.teaser ? tmp.teaser : ""
            itemObj.description = tmp.description ? tmp.description : ""
            itemObj.id = props.id
            app.itemColumns.forEach(c => itemObj[c.name] = tmp[c.name])
        } else if (props.item) {
            itemObj.name = props.item.name
            itemObj.teaser = props.item.teaser
            itemObj.description = props.item.description
            itemObj.id = props.item.id
            app.itemColumns.forEach(c => itemObj[c.name] = props.item[c.name])
        }
    }

    onMounted(readItem)

    watch(() => ([props.id, props.item]), readItem, { deep: true })
</script>

<style scoped>
.container {
    height: max-content;
    text-align: left;
}
.overlay {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    width: 100%;
    opacity: 0;
    transition: .5s ease;
    background-color: black;
}
.container:hover .overlay {
    opacity: 0.8;
}

.overlay-text {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    width: 100%;
    opacity: 0.8;
    background-color: black;
}

.text {
    color: white;
    position: absolute;
    text-align: center;
    line-height: 1em;
    width: 100%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    -ms-transform: translate(-50%, -50%);
}
</style>