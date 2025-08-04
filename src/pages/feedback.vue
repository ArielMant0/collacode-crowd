<template>
    <div class="d-flex justify-center mt-8">
        <div style="min-width: 300px; width: 75%; max-width: 1000px">
            <v-textarea v-model="text"
                density="compact"
                variant="outlined"
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
    </div>
</template>

<script setup>
    import { SOUND, useSounds } from '@/stores/sounds';
    import { addFeedback } from '@/use/data-api';
    import { POSITION, useToast } from 'vue-toastification';

    const toast = useToast()
    const sounds = useSounds()

    const text = ref("")

    async function submit() {
        if (text.value && text.value.length > 0) {
            try {
                // TODO: submit text feedback
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
</script>