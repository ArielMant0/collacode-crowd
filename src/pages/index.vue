<template>
  <div style="max-width: 100%" class="d-flex justify-center">
    <ItemSelectionView class="mt-4"/>
  </div>
</template>

<script setup>
    import ItemSelectionView from '@/components/ItemSelectionView.vue';
    import { useTimes } from '@/stores/times';
    import { loadLastUpdate } from '@/use/data-api';
    import { onMounted } from 'vue';

    const times = useTimes()

    async function checkUpdate() {
        try {
            const updates = await loadLastUpdate()
            const cut = updates.find(d => d.name === "crowd")
            if (cut && cut.timestamp > times.crowd) {
                times.needsReload("crowd")
            }
        } catch(e) {
            console.error(e.toString())
        }
    }

    onMounted(checkUpdate)
</script>
