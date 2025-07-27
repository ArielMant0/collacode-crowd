<template>
  <div style="max-width: 100%" class="d-flex flex-column align-center mt-4">

    <v-sheet
        class="text-caption pl-4 pr-4 pt-2 pb-2 bg-tertiary-light text-deep-purple-darken-4"
        elevation="4"
        rounded="lg"
        position="absolute"
        style="top: 50px; right: 10px;">
        #completed: {{ app.numSubmissions }}
    </v-sheet>

    <CrowdWorkerNotice/>

    <ItemSelectionView class="mt-4"/>
  </div>
</template>

<script setup>
    import CrowdWorkerNotice from '@/components/CrowdWorkerNotice.vue';
    import ItemSelectionView from '@/components/ItemSelectionView.vue';
    import { useApp } from '@/stores/app';
    import { useTimes } from '@/stores/times';
    import { loadLastUpdate } from '@/use/data-api';
    import { onMounted } from 'vue';

    const app = useApp()
    const times = useTimes()

    async function checkUpdate() {
        try {
            const updates = await loadLastUpdate()
            const cut = updates.find(d => d.name === "crowd")
            if (cut && cut.timestamp > times.crowd) {
                times.needsReload("crowd")
            }
        } catch(e) {
            console.error(e)
        }
    }

    onMounted(checkUpdate)
</script>
