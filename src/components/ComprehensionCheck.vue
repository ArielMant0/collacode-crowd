<template>
    <div>
        <h2 v-if="title" style="text-align: center;" class="mb-8">{{ title }}</h2>

        <div v-for="(q, idx) in questions" class="mb-6">
            <div><b>{{ idx+1 }}.</b> {{ q.question }}</div>
            <v-radio-group
                v-model="choices[q.id]"
                class="ml-4"
                hide-details
                hide-spin-buttons>
                <v-radio v-for="o in q.options"
                    :color="color"
                    :label="o.name"
                    :value="o.value">
                </v-radio>
            </v-radio-group>
        </div>

        <div style="text-align: center;">
            <v-btn
                @click="submit"
                :color="numAnswered < questions.length ? 'default' : submitColor"
                :disabled="numAnswered < questions.length">
                {{ submitText }}
            </v-btn>
        </div>
    </div>
</template>

<script setup>
    import { computed, onMounted } from 'vue';

    const props = defineProps({
        questions: {
            type: Array,
            required: true
        },
        color: {
            type: String,
            default: "primary"
        },
        submitText: {
            type: String,
            default: "submit"
        },
        submitColor: {
            type: String,
            default: "primary"
        },
        title: {
            type: String,
            required: false
        }
    })

    const emit = defineEmits(["submit"])

    const choices = ref({})

    const answers = computed(() => Object.values(choices.value).filter(d => Number.isInteger(d)))
    const numAnswered = computed(() => answers.value.length)

    function submit() {
        if (numAnswered.value === props.questions.length) {
            emit("submit", props.questions.map(q => choices.value[q.id]))
        }
    }
    function read() {
        const obj = {}
        props.questions.forEach(q => obj[q.id] = null)
        choices.value = obj
    }

    onMounted(read)
</script>