<template>
    <div class="pa-2" :style="{ maxWidth: maxWidth }">

        <v-card v-if="app.cwId" rounded="lg" color="error" class="mt-2 mb-4" title="Attention" density="compact">
            <v-card-text>
                Crowd workers can only do up to 3 {{ app.itemName }}s.
                After 3 {{ app.itemName }}s, other {{ app.itemName }}s can longer longer be completed
            </v-card-text>
        </v-card>

        <ItemSelectionPanel
            :subset="0"
            @click="chooseItem"
            :title="'Available '+app.itemNameCaptial+'s'"
            :count-target="countTarget"
            :selectable="true"/>

        <ItemSelectionPanel
            class="mt-8"
            :subset="1"
            :title="'Completed '+app.itemNameCaptial+'s'"
            :count-target="countTarget"
            :selectable="false"/>

        <ItemSelectionPanel v-if="app.itemsGone.size > 0"
            class="mt-8"
            :subset="2"
            :title="'Blocked '+app.itemNameCaptial+'s'"
            :count-target="countTarget"
            :selectable="false"/>

    </div>
</template>

<script setup>
    import { useApp } from '@/stores/app';
    import router from '@/router';
    import ItemSelectionPanel from './ItemSelectionPanel.vue';
    import { computed, watch } from 'vue';
    import { useDisplay } from 'vuetify';

    const app = useApp()

    const props = defineProps({
        numPerPage: {
            type: Number,
            default: 30,
        }
    })

    const countTarget = 10

    const { smAndDown, mdAndDown, lgAndDown, xlAndDown } = useDisplay()
    const maxWidth = computed(() => {
        if (smAndDown.value) {
            return "95%"
        } else if (mdAndDown.value) {
            return "90%"
        } else if (lgAndDown.value) {
            return "80%"
        } else if (xlAndDown.value) {
            return "1600px"
        }
        return "95%"
    })

    function chooseItem(item) {
        if (item._done) return
        app.setTarget(item)
        router.push('/similarity_game')
    }

</script>

