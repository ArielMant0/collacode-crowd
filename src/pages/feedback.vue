<template>
    <div>
        <h3>Open Feedback</h3>
        <div class="mt-4">
            <v-textarea v-model="text"
                density="compact"
                variant="outlined"
                placeholder="Write down your feedback here.."/>

            <div>
                <v-btn
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
    const text = ref("")

    function submit() {
        // TODO
    }
</script>