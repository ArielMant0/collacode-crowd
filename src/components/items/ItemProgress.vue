<template>
    <v-progress-linear
        :color="color"
        :model-value="percent"
        rounded
        height="10"
        class="mb-2">
        <span class="text-caption shadow-black" :style="{ color: fontColor }">
            {{ value }} / {{ target }}
        </span>
    </v-progress-linear>
</template>

<script setup>
import { computed } from 'vue';

    const props = defineProps({
        value: {
            type: Number,
            default: 0
        },
        target: {
            type: Number,
            default: 100
        },
        color: {
            type: String,
            default: "primary"
        },
        fontColor: {
            type: String,
            default: "#e4f5f1"
        }
    })

    const percent = computed(() => Math.min(100, Math.round(props.value / props.target * 100)))
</script>

<style scoped>
.shadow-black {
    text-shadow: 1px 1px 2px black
}
</style>