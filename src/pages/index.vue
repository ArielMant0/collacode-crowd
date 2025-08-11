<template>
  <div style="max-width: 100%" class="d-flex flex-column align-center mt-4">
    <CrowdWorkerNotice/>
    <ItemSelectionView class="mt-4"/>
  </div>
</template>

<script setup>
    import CrowdWorkerNotice from '@/components/CrowdWorkerNotice.vue';
    import ItemSelectionView from '@/components/ItemSelectionView.vue';
    import { useTimes } from '@/stores/times';
    import { addInteractionLog, loadLastUpdate } from '@/use/data-api';
    import { onMounted } from 'vue';

    const times = useTimes()

    async function checkUpdate() {
        try {
            const updates = await loadLastUpdate()
            const cut = updates.find(d => d.name === "crowd")
            if (cut && cut.timestamp > times.crowd) {
                times.needsReload("crowd_meta")
                times.needsReload("crowd")
            }
        } catch(e) {
            console.error(e)
        }
    }

    onMounted(function() {
        addInteractionLog("main page")
        checkUpdate()
    })
</script>
