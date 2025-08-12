<template>
    <div class="d-flex align-center justify-center">
        <v-btn-toggle v-bind="props"
            v-model="model"
            divided
            :disabled="disabled"
            density="comfortable"
            color="primary"
            variant="outlined">
            <v-btn prepend-icon="mdi-cards-variant" :value="GAME_IDS.CLUSTERS">clustering</v-btn>
            <v-btn prepend-icon="mdi-graph-outline" :value="GAME_IDS.BINSEARCH">binary search</v-btn>
        </v-btn-toggle>

        <v-tooltip location="bottom" open-delay="100">
            <template v-slot:activator="{ props }">
                <v-icon v-bind="props" class="ml-2">mdi-information-outline</v-icon>
            </template>
            <template #default>
                <div style="max-width: 300px;">
                    <div>
                        <v-icon>mdi-cards-variant</v-icon> in the clustering mode,
                        you are shown 5 groups of {{ app.itemName }}s through
                        which you can cycle to select up to 3 {{ app.itemName }}s
                        <img :src="w21" height="200px"></img>
                    </div>
                    <v-divider class="mt-2 mb-2"></v-divider>
                    <div>
                        <v-icon>mdi-graph-outline</v-icon> in the binary search mode,
                        each step divided the remaining {{ app.itemName }}s
                        into 2 groups based on a specific tag
                        <img :src="w22" height="200px"></img>
                    </div>
                </div>
            </template>
        </v-tooltip>
    </div>
</template>

<script setup>
    import { useApp } from '@/stores/app';
    import { GAME_IDS } from '@/stores/games';
    import w21 from '@/assets/about-workflow-2-1.jpg'
    import w22 from '@/assets/about-workflow-2-2.jpg'

    const app = useApp()
    const model = defineModel({ default: null })
    const props = defineProps({ disabled: { type: Boolean, default: false }})

</script>