<template>
    <div class="pa-2">
        <div v-if="app.isCrowdWorkerDone" class="d-flex justify-center">
            <CrowdWorkerNotice max-width="1000"/>
        </div>
        <SimilarityGame v-else-if="validMethod"
            :method="method"
            @close="onClose"
            @end="onEnd"
            @cancel="onCancel"/>
    </div>
</template>

<script setup>
    import CrowdWorkerNotice from '@/components/CrowdWorkerNotice.vue';
    import SimilarityGame from '@/components/SimilarityGame.vue';
    import router from '@/router';
    import { useApp } from '@/stores/app';
    import { GAME_IDS } from '@/stores/games';
    import { useTimes } from '@/stores/times';
    import { computed, onMounted } from 'vue';
    import { useToast } from 'vue-toastification';

    const app = useApp()
    const times = useTimes()
    const toast = useToast()

    const method = ref(0)
    const validMethod = computed(() => method.value === 1 || method.value === 2)

    function onCancel(delay=0) {
        if (delay > 0) {
            setTimeout(() => router.push("/"), delay)
        } else {
            router.push("/")
        }
    }
    function onEnd() {
        app.completedTarget()
        times.needsReload("crowd")
    }
    function onClose() {
        onCancel(100)
    }
    function read() {
        switch (app.method) {
            case 0:
                if (app.lastMethod === 0) {
                    method.value = Math.random() > 0.5 ?
                        GAME_IDS.BINSEARCH :
                        GAME_IDS.CLUSTERS
                } else {
                    method.value = app.lastMethod === GAME_IDS.CLUSTERS ?
                        GAME_IDS.BINSEARCH :
                        GAME_IDS.CLUSTERS
                }
                app.addMethodCount(method.value)
                break
            case 1:
            case 2:
                method.value = app.method
                app.addMethodCount(method.value)
                break
            default:
                toast.error("invalid method")
                method.value = 0
        }
    }

    onMounted(read)
</script>
