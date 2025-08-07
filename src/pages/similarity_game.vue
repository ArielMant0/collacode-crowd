<template>
    <div class="pa-2">
        <SimilarityGame v-if="!app.isCrowdWorkerDone && validMethod"
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
    import { useWindowSize } from '@vueuse/core';
    import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
    import { POSITION, useToast } from 'vue-toastification';

    const app = useApp()
    const times = useTimes()
    const toast = useToast()

    const method = ref(0)
    const validMethod = computed(() => method.value === 1 || method.value === 2)

    let alertId = null
    const { width, height } = useWindowSize()
    const validSize = computed(() => width.value >= 1280 && height.value >= 720)

    function onCancel(delay=0) {
        if (delay > 0) {
            setTimeout(() => router.replace("/"), delay)
        } else {
            router.replace("/")
        }
    }
    function onEnd() {
        app.completedTarget()
        times.needsReload("crowd")
    }
    function onClose() {
        onEnd()
        onCancel(250)
    }
    function read() {
        if (app.isCrowdWorker) {
            switch (app.method) {
                case 1:
                case 2:
                    method.value = app.method
                    app.addMethodCount(method.value)
                    break
                default:
                    method.value = 0
                    toast.error("invalid method")
            }
        } else {
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
        }
    }

    function showSizeAlert() {
        if (alertId === null) {
            alertId = toast.error(
                "Your window must be at least 1280 x 720 pixels big for an acceptable experience."+
                "A minimum window size of 1920 x 1080 is recommended for a good experience.",
                {
                    position: POSITION.TOP_CENTER,
                    timeout: false,
                    onClose: () => alertId = null
                }
            )
        }
    }

    function hideSizeAlert() {
        if (alertId !== null) {
            toast.dismiss(alertId)
            alertId = null
        }
    }

    onMounted(read)
    onBeforeUnmount(hideSizeAlert)

    watch(width, function() {
        if (!validSize.value) {
            showSizeAlert()
        } else {
            hideSizeAlert()
        }
    })

    watch(height, function() {
        if (!validSize.value) {
            showSizeAlert()
        } else {
            hideSizeAlert()
        }
    })

</script>
