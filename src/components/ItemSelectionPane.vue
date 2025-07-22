<template>
    <div class="pa-2">
        <div style="text-align: center;">Pick 1 {{ app.itemNameCaptial }}</div>
        <v-sheet rounded="lg" color="surface-light" class="ma-2 pa-4 d-flex flex-wrap justify-center">
            <ItemTeaser v-for="item in items"
                :item="item"
                @click="chooseItem(item)"
                class="mr-3 mb-3"/>
        </v-sheet>
    </div>
</template>

<script setup>
    import DM from '@/use/data-manager';
    import { useApp } from '@/stores/app';
    import { onMounted, ref } from 'vue';
    import ItemTeaser from './items/ItemTeaser.vue';
    import router from '@/router';

    const app = useApp()

    const items = ref([])

    function chooseItem(item) {
        app.setTarget(item)
        router.push('/similarity_game')
    }
    function read() {
        items.value = DM.getDataBy("items", d => app.itemSet.has(d.id))
    }

    onMounted(read)
</script>