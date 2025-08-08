<template>
    <div class="pa-2" :style="{ maxWidth: maxWidth }">
        <div v-if="app.inDevMode" style="text-align: center;" class="mb-6">
            <v-btn-toggle v-model="fixedMethod" divided density="comfortable" color="primary" variant="outlined">
                <v-btn icon="mdi-cards-variant" :value="1"></v-btn>
                <v-btn icon="mdi-graph-outline" :value="2"></v-btn>
            </v-btn-toggle>
        </div>
        <ItemSelectionPanel v-if="app.itemsLeft.size > 0"
            :subset="0"
            class="mb-8"
            @click="chooseItem"
            :title="'Available '+app.itemNameCaptial+'s'"
            :subtitle="'pick a '+app.itemName+' you know and click on it to start'"
            :count-target="countTarget"
            :pagination="false"
            :selectable="true"/>

        <ItemSelectionPanel v-if="app.itemsDone.size > 0"
            class="mb-8"
            :subset="1"
            :title="'Completed '+app.itemNameCaptial+'s'"
            :subtitle="'these are the '+app.itemName+'s you already completed'"
            :count-target="countTarget"
            :sortable="false"
            :selectable="false"/>

        <ItemSelectionPanel v-if="app.itemsGone.size > 0"
            :subset="2"
            :title="'Blocked '+app.itemNameCaptial+'s'"
            :subtitle="'these '+app.itemName+'s are blocked for you'"
            :count-target="countTarget"
            :sortable="false"
            :selectable="false"/>

    </div>
</template>

<script setup>
    import { useApp } from '@/stores/app';
    import router from '@/router';
    import ItemSelectionPanel from './ItemSelectionPanel.vue';
    import { computed } from 'vue';
    import { useDisplay } from 'vuetify';
    import { storeToRefs } from 'pinia';

    const app = useApp()
    const { fixedMethod } = storeToRefs(app)

    const props = defineProps({
        numPerPage: {
            type: Number,
            default: 30,
        }
    })

    const countTarget = 10

    const { smAndDown } = useDisplay()
    const maxWidth = computed(() => smAndDown.value ? "95%" : "90%")

    function chooseItem(item) {
        if (item._done) return
        app.setTarget(item)
        router.push('/similarity_game')
    }

</script>

