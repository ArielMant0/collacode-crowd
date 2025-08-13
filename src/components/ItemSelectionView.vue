<template>
    <div class="pa-2" :style="{ maxWidth: maxWidth }">
        <div v-if="!app.isCrowdWorker" style="text-align: center;" class="mb-6">
            <div class="text-caption">
                <i v-if="canFixMethod">use this to fix the similarity game mode</i>
                <i v-else>submit similarities for at least {{ CW_MAX_SUB }} {{ app.itemName }}s to unlock fixing the similarity game mode</i>
            </div>
            <GameModeToggle v-model="fixedMethod" :disabled="!canFixMethod"/>
        </div>
        <ItemSelectionPanel
            :subset="0"
            class="mb-8"
            @click="chooseItem"
            :title="'Available '+app.itemNameCaptial+'s'"
            :subtitle="'pick a '+app.itemName+' you know and click on it to start'"
            :count-target="countTarget"
            :pagination="false"
            :selectable="true"/>

        <ItemSelectionPanel
            class="mb-8"
            :subset="1"
            :title="'Completed '+app.itemNameCaptial+'s'"
            :subtitle="'these are the '+app.itemName+'s you already completed'"
            :count-target="countTarget"
            :sortable="false"
            :selectable="false"/>

        <ItemSelectionPanel
            :subset="2"
            :title="'Blocked '+app.itemNameCaptial+'s'"
            :subtitle="'these '+app.itemName+'s are blocked (for you)'"
            :count-target="countTarget"
            :sortable="false"
            :selectable="false"/>

    </div>
</template>

<script setup>
    import { CW_MAX_SUB, useApp } from '@/stores/app';
    import router from '@/router';
    import ItemSelectionPanel from './ItemSelectionPanel.vue';
    import { computed } from 'vue';
    import { useDisplay } from 'vuetify';
    import { storeToRefs } from 'pinia';
    import GameModeToggle from './GameModeToggle.vue';

    const app = useApp()
    const { fixedMethod } = storeToRefs(app)

    const props = defineProps({
        numPerPage: {
            type: Number,
            default: 30,
        }
    })

    const countTarget = 5

    const { smAndDown } = useDisplay()
    const maxWidth = computed(() => smAndDown.value ? "95%" : "90%")

    const canFixMethod = computed(() => app.inDevMode || app.numSubmissions >= CW_MAX_SUB)

    function chooseItem(item) {
        if (item._done) return
        app.setTarget(item)
        router.push('/similarity_game')
    }

</script>

