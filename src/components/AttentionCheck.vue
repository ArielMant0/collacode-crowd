<template>
    <div v-if="ready" class="pa-2">
        <div class="mt-8 mb-8" style="font-size: large; text-align: center;">
            This is an attention check.
            Please select the <strong>{{ target.color }} {{ target.shape }}</strong>
            <v-icon size="sm" class="ml-1 mb-1" :color="target.color">{{ 'mdi-'+target.shape }}</v-icon>
        </div>
        <div class="d-flex align-center" style="min-height: 100px;">
            <v-btn v-for="o in options"
                class="ml-2 mr-2"
                rounded="sm"
                size="80"
                :disabled="answered"
                @click="select(o)">
                <v-icon size="64" :color="o.color">{{ 'mdi-'+o.shape }}</v-icon>
            </v-btn>
        </div>
    </div>

</template>

<script setup>
    import { randomChoice, randomInteger, randomShuffle } from '@/use/random';
    import { computed, onMounted, reactive, ref } from 'vue';

    const props = defineProps({
        numOptions: {
            type: Number,
            default: 6
        }
    })
    const emit = defineEmits(["submit"])

    const shapes = ["square", "circle", "triangle"]
    const colors = ["blue", "red", "black", "grey"]

    const answered = ref(false)
    const options = ref([])
    const target = reactive({
        shape: null,
        color: null
    })
    const ready = computed(() => {
        return target.shape !== null &&
            target.color !== null &&
            options.value.length === props.numOptions
    })

    function select(option) {
        answered.value = true
        emit("submit", option.shape === target.shape && option.color === target.color)
    }

    function generate() {
        target.shape = randomChoice(shapes, 1)
        target.color = randomChoice(colors, 1)

        const opts = []
        opts.push({ shape: target.shape, color: target.color })

        const sameShape = randomInteger(
            1,
            Math.min(Math.floor(props.numOptions/2), colors.length-1)
        )

        const otherColors = colors.filter(c => c !== target.color)
        for (let i = 0; i < sameShape; ++i) {
            opts.push({ shape: target.shape, color: randomChoice(otherColors, 1) })
        }

        const otherShapes = shapes.filter(s => s !== target.shape)
        while (opts.length < props.numOptions) {
            opts.push({ shape: randomChoice(otherShapes, 1), color: randomChoice(colors, 1) })
        }

        options.value = randomShuffle(opts)
    }

    onMounted(generate)
</script>
