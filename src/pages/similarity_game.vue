<template>
    <div class="pa-2">
        <SimilarityGame v-if="validMethod"
            :method="method"
            @close="onClose"
            @end="onEnd"
            @cancel="onCancel"/>
    </div>
</template>

<script setup>
    import SimilarityGame from '@/components/SimilarityGame.vue';
    import router from '@/router';
    import { useApp } from '@/stores/app';
    import { GAME_IDS } from '@/stores/games';
    import { useTimes } from '@/stores/times';
    import { randomWeighted } from '@/use/random';
    import { storeToRefs } from 'pinia';
    import { computed, onMounted } from 'vue';
    import { useToast } from 'vue-toastification';

    const app = useApp()
    const times = useTimes()
    const toast = useToast()

    const { isCrowdWorker } = storeToRefs(app)

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
        router.push("/")
    }
    function read() {
        switch (app.method) {
            case 0:
                const c1 = app.getMethodCount(GAME_IDS.CLUSTERS)
                const c2 = app.getMethodCount(GAME_IDS.BINSEARCH)
                const sum = Math.max(1, c1 + c2)
                const w1 = 1 - (c1 / sum)
                const w2 = 1 - (c2 / sum)
                method.value = randomWeighted([GAME_IDS.CLUSTERS, GAME_IDS.BINSEARCH], [w1, w2])
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
