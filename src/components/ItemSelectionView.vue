<template>
    <div class="pa-2" :style="{ maxWidth: maxWidth }">
        <ItemSelectionPanel v-if="app.itemsLeft.size > 0"
            :subset="0"
            class="mb-8"
            @click="chooseItem"
            :title="'Available '+app.itemNameCaptial+'s'"
            :subtitle="'pick a '+app.itemName+' you know and click on it to start'"
            :count-target="countTarget"
            :selectable="true"/>

        <ItemSelectionPanel v-if="app.itemsDone.size > 0"
            class="mb-8"
            :subset="1"
            :title="'Completed '+app.itemNameCaptial+'s'"
            :count-target="countTarget"
            :selectable="false"/>

        <ItemSelectionPanel v-if="app.itemsGone.size > 0"
            :subset="2"
            :title="'Blocked '+app.itemNameCaptial+'s'"
            :subtitle="'these '+app.itemName+'s are blocked for you'"
            :count-target="countTarget"
            :selectable="false"/>

    </div>
</template>

<script setup>
    import { useApp } from '@/stores/app';
    import router from '@/router';
    import ItemSelectionPanel from './ItemSelectionPanel.vue';
    import { computed } from 'vue';
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

