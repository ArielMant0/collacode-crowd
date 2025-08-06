<template>
    <div class="d-flex justify-center">
        <div v-if="app.numSubmissions >= 3" style="min-width: 300px; width: 75%; max-width: 900px">

            <div style="margin-top: 1em; margin-bottom: 1em; font-size: 30px; text-align: center;">
                What do you think about this application?
            </div>

            <div>
                <div v-for="(q, idx) in questions" class="mb-8">
                    <div><b>{{ idx+1 }}.</b> {{ q.text }}</div>
                    <v-radio-group v-model="data.ratings[q.id]"
                        style="width: 100%;"
                        class="ml-4"
                        inline
                        @update:model-value="submitRatings"
                        hide-details
                        hide-spin-buttons>

                        <v-radio v-for="o in answerOptions"
                            :label="o.name"
                            :value="o.value"
                            color="primary">

                            <template #label>
                                <div class="mr-6">
                                    <div>
                                        {{ o.name }}
                                        <v-icon v-if="o.icon">{{ o.icon }}</v-icon>
                                    </div>
                                </div>
                            </template>
                        </v-radio>
                    </v-radio-group>
                </div>
            </div>

            <div style="margin-top: 2em; font-size: 30px; text-align: center;">
                Here you can send us open feedback about your experience with this application
                or about the project in general.
            </div>
            <v-textarea v-model="text"
                density="compact"
                variant="outlined"
                style="margin-top: 4em;"
                label="Feedback (max. 1000 characters)"
                hide-spin-buttons
                :rows="10"
                :rules="[v => v.length <= 1000 || 'feedback can only be up to 1000 characters']"
                placeholder="Write down your feedback here.."/>

            <div style="text-align: center;">
                <v-btn
                    class="mt-2"
                    density="comfortable"
                    @click="submit"
                    :disabled="!text || text.length === 0"
                    :color="text && text.length > 0 ? 'primary' : 'default'">
                    submit
                </v-btn>
            </div>
        </div>
        <div v-else style="margin-top: 2em; font-size: 30px; text-align: center;">
            You must complete at least 3 {{ app.itemName }}s before you can give feedback.
        </div>
    </div>
</template>

<script setup>
    import { useApp } from '@/stores/app';
    import { SOUND, useSounds } from '@/stores/sounds';
    import { addFeedback, addRatings, getClientRatings, getRatingStats } from '@/use/data-api';
    import { storeToRefs } from 'pinia';
    import { onMounted, reactive, watch } from 'vue';
    import { POSITION, useToast } from 'vue-toastification';

    const app = useApp()
    const toast = useToast()
    const sounds = useSounds()

    const { activeUserId } = storeToRefs(app)

    const text = ref("")

    const data = reactive({
        ratings: {},
        stats: {},
        maxCount: 1
    })

    const questions = [
        { id: "ease", text: "I found it easy to use this application." },
        { id: "fun", text: "I had fun using this application." },
        { id: "satisfaction", text: "I am satisfied with the results I got using this application." },
        { id: "preference", text: "I prefer using this application over searching through a list to find similar items." },
    ]
    const answerOptions = [
        { name: "strongly agree", value: 5, icon: "mdi-emoticon-happy-outline" },
        { name: "agree", value: 4 },
        { name: "neutral", value: 3, icon: "mdi-emoticon-neutral-outline" },
        { name: "disagree", value: 2 },
        { name: "strongly disagree", value: 1, icon: "mdi-emoticon-sad-outline" }
    ]

    async function read() {

        const obj = {}
        questions.forEach(q => obj[q.id] = null)

        try {
            // get ratings for this client
            const res = await getClientRatings()
            for (const id in res) {
                obj[id] = res[id]
            }
        } catch (e) {
            console.error(e.toString())
        }

        data.ratings = obj

        getGlobalRatings()
    }

    async function getGlobalRatings() {
        try {
            // get global ratings stats
            const res = await getRatingStats()
            data.maxCount = 1
            for (const id in res) {
                if (data.ratings[id] === null) continue
                for (const rating in res[id]) {
                    data.maxCount = Math.max(data.maxCount, res[id][rating])
                }
            }
            data.stats = res
        } catch (e) {
            console.error(e.toString())
        }
    }

    async function submit() {
        if (text.value && text.value.length > 0) {
            try {
                // submit text feedback
                await addFeedback(text.value)
                sounds.play(SOUND.WIN_MINI)
                toast.success(
                    "thanks for your feedback :)",
                    {
                        position: POSITION.TOP_CENTER,
                        timeout: 2000
                    }
                )
                text.value = ""
            } catch(e) {
                console.error(e.toString())
                toast.error("invalid feedback")
            }
        }
    }

    async function submitRatings() {
        const values = Object.values(data.ratings)
        if (values.some(v => v !== null)) {
            try {
                // submit ratings
                console.log(data.ratings)
                await addRatings(data.ratings)
                sounds.play(SOUND.CLICK)
                getGlobalRatings()
            } catch(e) {
                console.error(e.toString())
                toast.error("invalid rating")
            }
        }
    }

    onMounted(read)

    watch(activeUserId, read)
</script>